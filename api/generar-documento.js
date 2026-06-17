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
- Devuelve SOLO un FRAGMENTO HTML del contenido del escrito, sin explicaciones ni comentarios
- PROHIBIDO ABSOLUTAMENTE incluir <!DOCTYPE>, <html>, <head>, <body>, <title>, <meta>, <style> o atributos style="..."
- NO uses clases CSS (class="..."). El estilo lo aplica la aplicación; tú solo entregas el contenido estructurado
- Usa SOLO etiquetas semánticas de contenido: <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>
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
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";

    return res.status(200).json({ html: toFragment(raw) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/generar-documento]", msg);
    return res.status(500).json({ error: msg });
  }
}

// Reduce model output to a safe body fragment. Models sometimes return a full
// HTML document (<!DOCTYPE><html><head><style>…</style>…</body></html>); inserting
// that via innerHTML leaks its <style> — a body{...} rule there restyles the WHOLE
// app. Strip code fences, keep only the <body> inner content if a document was
// returned, and remove document-level + <style>/<script> tags.
function toFragment(raw) {
  let s = (raw || "")
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) s = body[1];
  return s
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body|meta|title|link|base)\b[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();
}
