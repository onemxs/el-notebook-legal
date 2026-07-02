import type { Plugin } from "vite";
import { loadEnv } from "vite";

/**
 * Dev-only proxy: POST /api/analizar
 * Lets the browser send a dropped document (PDF / image / text) for real analysis
 * by Claude WITHOUT exposing the API key. The key lives here (server side, read
 * from .env); the browser only ever talks to this local endpoint.
 *
 * In a production build this route doesn't exist, so the app falls back to the
 * demo responder (and, eventually, the Supabase Edge Function path).
 */
const BRANCHES = [
  "penal", "electoral", "laboral", "civil", "mercantil",
  "administrativo", "fiscal", "amparo", "constitucional",
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    branch: { type: "string", enum: BRANCHES },
    confidence: { type: "number" },
    caseName: { type: "string" },
    asunto: { type: "string" },
    parties: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
      },
    },
    keyDates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
      },
    },
    summary: { type: "string" },
    suggestedLaws: { type: "array", items: { type: "string" } },
    cronologia: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "deadline"] },
        },
        required: ["date", "title", "detail", "severity"],
      },
    },
    transcripcion: { type: "string" },
  },
  required: [
    "branch", "confidence", "caseName", "asunto",
    "parties", "keyDates", "summary", "suggestedLaws", "cronologia", "transcripcion",
  ],
};

const SYSTEM = `Eres el asistente de admisión de expedientes de "El Notebook Legal", para abogados de México.
Lees el documento del cliente (demanda, contrato, pagaré, oficio, carpeta, etc.) y extraes sus datos generales.

Devuelve EXCLUSIVAMENTE el objeto JSON del esquema, en español, sin texto adicional. Reglas:
- branch: la rama del derecho mexicano más apropiada, una de: penal, electoral, laboral, civil, mercantil, administrativo, fiscal, amparo, constitucional.
- confidence: qué tan seguro estás de la rama (0 a 1).
- caseName: nombre corto y descriptivo del expediente (ej. "Despido · Pérez vs. Comercializadora del Bajío").
- asunto: el tipo de asunto en una línea.
- parties: las partes con su rol (Actor, Demandado, Quejoso, Autoridad, Imputado, etc.).
- keyDates: fechas relevantes con etiqueta (fecha de los hechos, notificación, vencimientos, plazos de prescripción si los infieres del tipo de asunto).
- summary: 2-3 frases con lo esencial y lo que el abogado debe vigilar.
- suggestedLaws: abreviaturas de leyes mexicanas aplicables (ej. "LFT", "CPEUM", "Cód. Comercio", "CFF", "CNPP").
- cronologia: la SECUENCIA ORDENADA de los hechos con fecha que narra el documento, del más antiguo al más reciente. Cada evento es un objeto:
    · date: la fecha del hecho en formato "DD de MES de AAAA" (ej. "15 de mayo de 2025"). Si solo hay mes y año, usa "MES de AAAA". Si infieres un plazo legal, calcula y pon su fecha estimada.
    · title: frase corta del hecho (ej. "Notificación del acto de autoridad").
    · detail: una frase de contexto o de su relevancia procesal.
    · severity: "deadline" para plazos, vencimientos, prescripciones o términos procesales; "warning" para contradicciones de fecha o riesgos; "info" para hechos ordinarios.
  Incluye tanto los hechos narrados como los plazos legales que se deriven del tipo de asunto. Si el documento no tiene ninguna fecha, devuelve cronologia como arreglo vacío [].
- transcripcion: un RESUMEN breve y fiel del documento (máximo 4-5 frases). NO copies el texto completo del documento, solo resúmelo.
Si no encuentras un dato, usa un valor razonable o "No especificado". No inventes nombres propios que no estén en el documento.`;

interface ReqBody {
  name?: string;
  mediaType?: string;
  base64?: string;
  text?: string;
  forceBranch?: string | null;
}

function buildContent(b: ReqBody): unknown[] {
  const hint = b.forceBranch
    ? `\nLa rama ya está determinada como "${b.forceBranch}"; úsala en el campo branch con confidence 0.95.`
    : "";
  const instruction = `Analiza este documento (archivo: ${b.name ?? "documento"}) y extrae sus datos generales conforme al esquema.${hint}`;

  if (b.text) {
    return [{ type: "text", text: `${instruction}\n\n--- DOCUMENTO ---\n${b.text}` }];
  }
  if (b.mediaType === "application/pdf" && b.base64) {
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: b.base64 } },
      { type: "text", text: instruction },
    ];
  }
  if (b.mediaType?.startsWith("image/") && b.base64) {
    return [
      { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.base64 } },
      { type: "text", text: instruction },
    ];
  }
  // Unsupported (e.g. .docx) — let the caller fall back to the demo path.
  return [];
}

export function claudeProxy(): Plugin {
  return {
    name: "claude-analizar-proxy",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const anthropicKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const model = env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
      const anthropicBaseURL = env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_BASE_URL;

      server.middlewares.use("/api/analizar", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return send(405, { error: "method_not_allowed" });

        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          if (!anthropicKey) return send(200, { error: "not_configured" });
          try {
            const body: ReqBody = JSON.parse(raw || "{}");
            const content = buildContent(body);
            if (content.length === 0) return send(200, { error: "unsupported_type" });

            const { default: Anthropic } = await import("@anthropic-ai/sdk");
            const client = new Anthropic(anthropicBaseURL ? { apiKey: anthropicKey, baseURL: anthropicBaseURL } : { apiKey: anthropicKey });

            const message = await client.messages.create({
              model,
              max_tokens: 8000,
              system: SYSTEM,
              messages: [{ role: "user", content: content as never }],
              output_config: { format: { type: "json_schema", schema: SCHEMA } } as never,
            });

            if (message.stop_reason === "max_tokens") {
              console.error("[/api/analizar] respuesta truncada por max_tokens");
              return send(200, { error: "respuesta_truncada_por_longitud" });
            }

            const textBlock = message.content.find((b) => b.type === "text");
            const jsonText = textBlock && "text" in textBlock ? textBlock.text : "{}";
            const parsed = JSON.parse(jsonText);
            console.log(`[/api/analizar] OK (${model}) → ${parsed.branch ?? "?"} · ${parsed.caseName ?? "?"}`);
            send(200, { ...parsed, source: "ia" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[/api/analizar]", msg);
            send(200, { error: msg });
          }
        });
      });
    },
  };
}
