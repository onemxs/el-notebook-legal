import type { Plugin } from "vite";
import { loadEnv } from "vite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
    transcripcion: { type: "string" },
  },
  required: [
    "branch", "confidence", "caseName", "asunto",
    "parties", "keyDates", "summary", "suggestedLaws", "transcripcion",
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
- transcripcion: el texto literal del documento tal como lo lees (o un resumen fiel si es muy largo).
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

async function transcribeWithWhisper(
  filePath: string,
  apiKey: string,
  baseURL: string = "https://api.openai.com/v1",
): Promise<string> {
  const fileStream = fs.createReadStream(filePath);

  const formData = new (await import("form-data")).default();
  formData.append("file", fileStream);
  formData.append("model", "whisper-1");
  formData.append("language", "es");
  formData.append("response_format", "verbose_json");

  const response = await fetch(`${baseURL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData as never,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const result = (await response.json()) as {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  if (result.segments && result.segments.length > 0) {
    return result.segments
      .map((seg) => {
        const start = formatTimestamp(seg.start);
        return `[${start}] ${seg.text.trim()}`;
      })
      .join("\n");
  }

  return result.text;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function saveUploadedFile(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `video-${Date.now()}.tmp`);
    const stream = fs.createWriteStream(tmpFile);

    stream.on("finish", () => resolve(tmpFile));
    stream.on("error", reject);
    req.pipe(stream);
  });
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
      const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const openaiBaseURL = env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;

      server.middlewares.use("/api/transcribe-video", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return send(405, { error: "method_not_allowed" });

        (async () => {
          if (!openaiKey) {
            return send(200, { error: "not_configured", message: "OPENAI_API_KEY not set" });
          }

          const whistlebaseURL = openaiBaseURL || "https://api.openai.com/v1";

          let tmpFile: string | null = null;
          try {
            tmpFile = await saveUploadedFile(req);

            const transcription = await transcribeWithWhisper(tmpFile, openaiKey, whistlebaseURL);
            const result = {
              id: `transcription-${Date.now()}`,
              fileName: "video",
              duration: 0,
              transcription,
              language: "es-MX",
              createdAt: Date.now(),
            };

            send(200, result);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[/api/transcribe-video]", msg);
            send(200, { error: msg });
          } finally {
            if (tmpFile) {
              try {
                fs.unlinkSync(tmpFile);
              } catch {
              }
            }
          }
        })();
      });

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
              max_tokens: 4000,
              system: SYSTEM,
              messages: [{ role: "user", content: content as never }],
              output_config: { format: { type: "json_schema", schema: SCHEMA } } as never,
            });

            const textBlock = message.content.find((b) => b.type === "text");
            const jsonText = textBlock && "text" in textBlock ? textBlock.text : "{}";
            const parsed = JSON.parse(jsonText);
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
