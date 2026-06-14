// Edge Function: consultar — búsqueda semántica sobre el corpus jurídico.
// Recibe { query, rama?, codigos?, matchCount? }, embebe la consulta y ejecuta
// match_articulos. Los secretos (OpenAI, service role) viven aquí, nunca en el cliente.
//
// Deploy:  supabase functions deploy consultar
// Secrets: supabase secrets set OPENAI_API_KEY=... (SUPABASE_URL y
//          SUPABASE_SERVICE_ROLE_KEY ya existen en el entorno de Functions)
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { query, rama = null, codigos = null, matchCount = 6 } = await req.json();
    if (!query || typeof query !== "string") {
      return json({ error: "Falta 'query'." }, 400);
    }

    const baseUrl = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
    const model = Deno.env.get("EMBED_MODEL") ?? "text-embedding-3-small";

    const er = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({ model, input: query }),
    });
    if (!er.ok) return json({ error: `Embeddings ${er.status}` }, 502);
    const embedding = (await er.json()).data[0].embedding;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("match_articulos", {
      query_embedding: embedding,
      match_count: matchCount,
      filtro_rama: rama,
      filtro_codigos: codigos,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ articulos: data });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
