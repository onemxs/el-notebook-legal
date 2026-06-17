export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // ponytail: Opus por defecto para docs (redacción extensa/meticulosa). Override con ANTHROPIC_MODEL_DOCS.
  const model = process.env.ANTHROPIC_MODEL_DOCS || "claude-opus-4-8";
  const baseURL = process.env.ANTHROPIC_BASE_URL;

  if (!apiKey) {
    return res.status(400).json({ error: "not_configured" });
  }

  try {
    const { kind, kindLabel, branch, branchName, caseName, parties, facts, lawName } = req.body;

    const partiesBlock = parties?.length
      ? parties.map((p) => `• ${p.label}: ${p.value}`).join("\n")
      : "No especificadas";

    const factsBlock = facts?.length
      ? facts.join("\n\n---\n\n")
      : "Sin documentos analizados en el expediente.";

    // RAG obligatorio (backend): consulta vectorial al corpus legal con los términos
    // clave del expediente. Best-effort: si el corpus no está ingerido, devuelve [].
    const ragQuery = [kindLabel, branchName, caseName, partiesBlock, factsBlock]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 1500);
    const articles = await buscarArticulos(ragQuery, branch);
    const articlesBlock = articles.length
      ? articles
          .map((a) => `**${a.codigo} — Art. ${a.articulo} (vigente):**\n${(a.texto || "").slice(0, 800)}`)
          .join("\n\n")
      : "";

    const esApelacion = /apel/i.test(kind || "") || /apel/i.test(kindLabel || "");

    const estructura = esApelacion
      ? `ESTRUCTURA OBLIGATORIA — RECURSO DE APELACIÓN (no escribas un capítulo de "Hechos"):
1. RUBRO: tribunal de alzada, número de toca/expediente (o ______ si no consta), y las partes con su rol correcto.
2. PROEMIO: quién promueve y con qué personalidad, contra qué resolución y de qué juzgado (o ______), y la vía.
3. AGRAVIOS: analiza el expediente, detecta las violaciones al debido proceso o inconsistencias narradas por el abogado, y redacta CADA agravio de forma estructurada y silogística:
   • Premisa Mayor — la norma o principio jurídico violado (cítalo).
   • Premisa Menor — el acto u omisión concreto del juez de origen que la transgrede.
   • Conclusión — el perjuicio causado al recurrente y por qué procede revocar o modificar la resolución.
4. DERECHO: integra TEXTUALMENTE los artículos vigentes provistos.
5. PUNTOS PETITORIOS.`
      : `ESTRUCTURA OBLIGATORIA: Rubro · Proemio · Hechos (narrativa cronológica fluida extraída del expediente) · Derecho (integra TEXTUALMENTE los artículos provistos) · Puntos Petitorios.`;

    const SYSTEM = `Eres un abogado postulante experto en derecho mexicano. Tienes prohibido delegar la escritura al usuario mediante marcadores de posición o corchetes. Debes redactar cada sección de forma fluida, extensa, meticulosa y con terminología jurídica formal y elegante. Si faltan datos específicos (como el número de juzgado), deja una línea limpia en blanco ______ en lugar de inventar una ciudad o institución.

REGLAS DE PRECISIÓN JURÍDICA:
- PROHIBIDO: corchetes, "[Describa…]", "[Inserte aquí…]", texto genérico de relleno, plantillas vacías, y ciudades o instituciones inventadas por defecto. Donde falte un dato, escribe ______.
- UBICACIÓN: extrae el Estado y Municipio reales del expediente (de los hechos, pruebas o datos generales) y úsalos en el cierre y el proemio. Si el caso ocurre en Veracruz, jamás cierres con "Ciudad de México": usa la ubicación real. Si no consta, ______.
- PARTES: identifica con precisión el rol de cada parte según el contexto (víctima/ofendido vs. imputado; actor vs. demandado; quejoso vs. autoridad responsable) y colócalas correctamente en el RUBRO y el PROEMIO.
- DERECHO: integra TEXTUALMENTE los artículos vigentes que se te proporcionen. NO inventes números de artículo: si no se te proporciona uno, cita el código por su nombre y deja el número como ______ antes que fabricarlo.
- FORMATO: devuelve SOLO un FRAGMENTO HTML (sin <!DOCTYPE>, <html>, <head>, <body>, <title>, <meta>, <style> ni atributos style="..." ni class="..."). Usa solo <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>.
- El escrito debe quedar completo y listo para revisión formal y firma.`;

    const prompt = `Redacta un **${kindLabel}** completo para el siguiente expediente de materia **${branchName}**.

**EXPEDIENTE:** ${caseName}

## PARTES (asígnales su rol procesal correcto en rubro y proemio):
${partiesBlock}

## EXPEDIENTE DEL CLIENTE (hechos, pruebas y datos generales — de AQUÍ extrae la ubicación real, los roles de las partes y los agravios):
${factsBlock}

## LEGISLACIÓN PRINCIPAL DE LA RAMA: ${lawName || "la aplicable a la materia"}

${
      articlesBlock
        ? `## ARTÍCULOS VIGENTES DEL CORPUS (intégralos TEXTUALMENTE en la sección de Derecho):\n${articlesBlock}`
        : "## ARTÍCULOS: el corpus legal no devolvió artículos para este caso. NO inventes números de artículo; cita los códigos aplicables por su nombre y deja el número como ______ donde no lo tengas verificado."
    }

${estructura}

Redacta el HTML del escrito — extenso, meticuloso y elegante — sin un solo corchete ni placeholder.`;

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

// RAG: embed la consulta (OpenAI) y busca en el corpus con match_articulos vía
// PostgREST RPC (service role → sin CORS, bypassa RLS). Server-side. Best-effort:
// devuelve [] si falta una credencial o el corpus no está ingerido.
async function buscarArticulos(query, rama) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (!url || !key || !openai || !query) return [];
  try {
    const er = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openai}` },
      body: JSON.stringify({ model: process.env.EMBED_MODEL || "text-embedding-3-small", input: query }),
    });
    if (!er.ok) return [];
    const embedding = (await er.json()).data?.[0]?.embedding;
    if (!embedding) return [];
    const r = await fetch(`${url}/rest/v1/rpc/match_articulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 6, filtro_rama: rama ?? null, filtro_codigos: null }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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
