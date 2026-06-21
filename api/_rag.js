// RAG compartido: embed la consulta (OpenAI) y busca en el corpus legal con
// match_articulos vía PostgREST RPC (service role → sin CORS, bypassa RLS).
// Server-side. Best-effort: devuelve [] si falta una credencial o el corpus.
// El prefijo `_` evita que Vercel lo trate como un endpoint.
export async function buscarArticulos(query, rama) {
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
