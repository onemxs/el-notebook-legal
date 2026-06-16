export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const baseURL = process.env.ANTHROPIC_BASE_URL;

  if (!apiKey) {
    return res.status(400).json({ error: "not_configured" });
  }

  try {
    const { kind, kindLabel, branch, branchName, caseName, parties, facts, articles, lawName } =
      req.body;

    const partiesBlock = parties?.length
      ? parties.map((p) => `• ${p.label}: ${p.value}`).join("\n")
      : "No especificadas";

    const factsBlock = facts?.length
      ? facts.join("\n\n---\n\n")
      : "Sin documentos analizados en el expediente.";

    const articlesBlock = articles?.length
      ? articles
          .map(
            (a) =>
              `**${a.codigo} — Art. ${a.articulo}:**\n${a.texto.slice(0, 500)}`,
          )
          .join("\n\n")
      : "";

    const SYSTEM = `Eres un redactor jurídico experto en derecho procesal mexicano. Generas escritos legales formales, completos y listos para firma, en formato HTML.

REGLAS ESTRICTAS:
- NUNCA uses corchetes, placeholders ni texto genérico como "[Inserte aquí…]" o "[Describa…]"
- Usa EXCLUSIVAMENTE los datos reales del expediente proporcionados
- Redacta los hechos como narrativa cronológica fluida basada en la información del caso
- Si se proporcionan artículos de ley, cítalos textualmente dentro de la sección de Derecho
- Si NO hay información suficiente para un campo, redacta una nota breve indicando qué falta
- Sigue el formato procesal mexicano formal: Rubro, Proemio, Hechos, Derecho, Puntos Petitorios
- Devuelve SOLO el HTML del documento, sin explicaciones ni comentarios fuera del escrito
- Usa etiquetas HTML semánticas: <p>, <h2>, <strong>
- El documento debe estar listo para imprimir y firmar`;

    const prompt = `Genera un escrito legal completo de tipo **${kindLabel}** para el siguiente expediente:

**TIPO DE DOCUMENTO:** ${kindLabel}
**RAMA DEL DERECHO:** ${branchName}
**EXPEDIENTE:** ${caseName}

## PARTES DEL CASO:
${partiesBlock}

## HECHOS Y CONTENIDO DE LOS DOCUMENTOS DEL EXPEDIENTE:
${factsBlock}

## LEGISLACIÓN PRINCIPAL: ${lawName || "No especificada"}

${articlesBlock ? `## ARTÍCULOS APLICABLES (extraídos de la base de datos legal):\n${articlesBlock}` : "No se encontraron artículos específicos en la base de datos. Usa los fundamentos generales de la rama."}

Genera el escrito HTML completo con la estructura procesal mexicana formal.`;

    const { Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic(baseURL ? { apiKey, baseURL } : { apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const html = textBlock && "text" in textBlock ? textBlock.text : "";

    const cleaned = html
      .replace(/^```html\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    return res.status(200).json({ html: cleaned });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/generar-documento]", msg);
    return res.status(500).json({ error: msg });
  }
}
