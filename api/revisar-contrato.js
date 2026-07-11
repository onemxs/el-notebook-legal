// Revisión de contratos con IA: semáforo de riesgo por cláusula, partes,
// vigencia y cláusulas faltantes. Alimenta la vista "Auditoría Contractual".
// Mismo contrato de seguridad que /api/analizar: JWT + cuota + tokens.
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
    return res.status(400).json({ error: "not_configured" });
  }

  try {
    const { name, mediaType, base64, text } = req.body;

    const instruction = `Audita este contrato (archivo: ${name ?? "contrato"}) conforme al esquema. Sé exhaustivo con las cláusulas de riesgo.`;
    let content = [];
    if (text) {
      content.push({ type: "text", text: `${instruction}\n\n--- CONTRATO ---\n${text}` });
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

    const FIELD = {
      type: "object",
      additionalProperties: false,
      properties: { label: { type: "string" }, value: { type: "string" } },
      required: ["label", "value"],
    };

    const SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: {
        tipoContrato: { type: "string" },
        riskScore: { type: "integer" },
        parties: { type: "array", items: FIELD },
        vigencia: {
          type: "object",
          additionalProperties: false,
          properties: {
            inicio: { type: "string" },
            fin: { type: "string" },
            renovacion: { type: "string" },
          },
          required: ["inicio", "fin", "renovacion"],
        },
        pros: { type: "array", items: { type: "string" } },
        cons: { type: "array", items: { type: "string" } },
        strategy: { type: "string" },
        criticalClauses: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              risk: { type: "string", enum: ["alto", "medio", "bajo"] },
              currentText: { type: "string" },
              alternativeText: { type: "string" },
            },
            required: ["title", "risk", "currentText", "alternativeText"],
          },
        },
        faltantes: { type: "array", items: { type: "string" } },
      },
      required: [
        "tipoContrato", "riskScore", "parties", "vigencia",
        "pros", "cons", "strategy", "criticalClauses", "faltantes",
      ],
    };

    const SYSTEM = `Eres el auditor contractual de PasantIA, experto en derecho mexicano (Código Civil Federal, Código de Comercio, LFT, LFPDPPP).
Lees el contrato y produces una auditoría de riesgos PARA EL ABOGADO que representa a quien lo consulta.

Devuelve EXCLUSIVAMENTE el objeto JSON del esquema, en español. Reglas:
- tipoContrato: tipo y objeto en una línea (ej. "Arrendamiento de inmueble comercial").
- riskScore: 0 a 100 (0 = equilibrado, 100 = gravemente desequilibrado o riesgoso).
- parties: cada parte con su rol contractual (Arrendador, Arrendatario, Prestador, Cliente, Fiador, etc.) y nombre tal como aparece.
- vigencia: inicio, fin y regla de renovación/terminación anticipada, con fechas textuales del contrato en formato "DD de MES de AAAA" cuando existan; si no consta, "No especificado".
- pros: puntos que protegen o favorecen (lista concreta, citando la cláusula cuando se pueda).
- cons: riesgos y "letras chiquitas": penas desproporcionadas, renuncias de derechos, jurisdicción desventajosa, responsabilidad ilimitada, renovación automática oculta, intereses usurarios, facultades unilaterales.
- strategy: 2-4 frases de estrategia de negociación priorizada.
- criticalClauses: las cláusulas que deben renegociarse. Por cada una:
    · title: nombre corto de la cláusula.
    · risk: "alto" (pérdida patrimonial o de derechos grave), "medio" (desequilibrio negociable), "bajo" (mejorable).
    · currentText: cita textual o paráfrasis fiel del texto actual.
    · alternativeText: redacción alternativa concreta lista para proponer, equilibrada y válida en derecho mexicano.
- faltantes: cláusulas recomendadas que el contrato NO tiene (ej. límite de responsabilidad, confidencialidad, caso fortuito, terminación anticipada, jurisdicción, protección de datos) — solo las realmente pertinentes al tipo de contrato.
- NO inventes texto que no esté en el documento: si un dato no consta, dilo ("No especificado"). Las citas de currentText deben ser fieles al contrato.`;

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

    if (message.stop_reason === "max_tokens") {
      console.error("[/api/revisar-contrato] respuesta truncada por max_tokens");
      return res.status(500).json({ error: "respuesta_truncada_por_longitud" });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    const jsonText = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const parsed = JSON.parse(jsonText);

    return res.status(200).json({ ...parsed, source: "ia" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/revisar-contrato]", msg);
    return res.status(500).json({ error: msg });
  }
}
