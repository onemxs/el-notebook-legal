import { requireUser, registrarTokensIA } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const baseURL = process.env.ANTHROPIC_BASE_URL;

  if (!apiKey) {
    return res.status(400).json({
      error: "not_configured",
      message: "ANTHROPIC_API_KEY environment variable not set",
    });
  }

  try {
    const { name, mediaType, base64, text, forceBranch } = req.body;

    let content = [];
    const hint = forceBranch
      ? `\nLa rama ya está determinada como "${forceBranch}"; úsala en el campo branch con confidence 0.95.`
      : "";
    const instruction = `Analiza este documento (archivo: ${name ?? "documento"}) y extrae sus datos generales conforme al esquema.${hint}`;

    if (text) {
      content.push({
        type: "text",
        text: `${instruction}\n\n--- DOCUMENTO ---\n${text}`,
      });
    } else if (mediaType === "application/pdf" && base64) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
      content.push({ type: "text", text: instruction });
    } else if (mediaType && mediaType.startsWith("image/") && base64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
      content.push({ type: "text", text: instruction });
    } else {
      return res.status(400).json({ error: "unsupported_type" });
    }

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
- keyDates: fechas clave (JSON array de {label, value}).
- summary: 2-3 frases con lo esencial.
- suggestedLaws: abreviaturas de leyes mexicanas (ej. "LFT", "CPEUM", "Cód. Comercio").
- cronologia: la SECUENCIA ORDENADA de los hechos con fecha que narra el documento, del más antiguo al más reciente. Cada evento es un objeto:
    · date: la fecha del hecho en formato "DD de MES de AAAA" (ej. "15 de mayo de 2025"). Si solo hay mes y año, usa "MES de AAAA". Si infieres un plazo legal, calcula y pon su fecha estimada.
    · title: frase corta del hecho (ej. "Notificación del acto de autoridad").
    · detail: una frase de contexto o de su relevancia procesal.
    · severity: "deadline" para plazos, vencimientos, prescripciones o términos procesales; "warning" para contradicciones de fecha o riesgos; "info" para hechos ordinarios.
  Incluye tanto los hechos narrados como los plazos legales que se deriven del tipo de asunto (con su fecha estimada). Si no hay ninguna fecha en el documento, devuelve cronologia como arreglo vacío [].
- transcripcion: una RELACIÓN FIEL, ORDENADA Y COMPLETA del contenido sustantivo del documento, pensada para que otro abogado pueda CONTESTARLO punto por punto. Si es una demanda o escrito con hechos y prestaciones, enuméralos TODOS tal como se narran (Hecho 1: …, Hecho 2: …; Prestación a): …, b): …), conservando fechas, cantidades, nombres y fundamentos exactos. No lo reduzcas a 4-5 frases; sé completo pero sin relleno, hasta un máximo de ~450 palabras (si el documento es muy extenso, prioriza los hechos y prestaciones esenciales sin exceder ese límite).
Si no encuentras un dato, usa un valor razonable o "No especificado". No inventes nombres.`;

    const { Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic(baseURL ? { apiKey, baseURL } : { apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    await registrarTokensIA(auth.user.id, message.model, message.usage);

    // A truncated response yields invalid JSON; surface it clearly instead of a
    // cryptic parse error so the client knows to retry / raise max_tokens.
    if (message.stop_reason === "max_tokens") {
      console.error("[/api/analizar] respuesta truncada por max_tokens");
      return res.status(500).json({ error: "respuesta_truncada_por_longitud" });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    const jsonText = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const parsed = JSON.parse(jsonText);

    return res.status(200).json({ ...parsed, source: "ia" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/analizar]", msg);
    return res.status(500).json({ error: msg });
  }
}
