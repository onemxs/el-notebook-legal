export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

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
- keyDates: fechas clave (JSON array de {label, value}).
- summary: 2-3 frases con lo esencial.
- suggestedLaws: abreviaturas de leyes mexicanas (ej. "LFT", "CPEUM", "Cód. Comercio").
- transcripcion: el texto literal o resumen del documento.
Si no encuentras un dato, usa un valor razonable o "No especificado". No inventes nombres.`;

    const { Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic(baseURL ? { apiKey, baseURL } : { apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

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
