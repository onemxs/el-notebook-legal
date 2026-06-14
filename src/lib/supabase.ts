import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the public Supabase config is present (RLS-protected reads). */
export const SUPA_CONFIGURED = Boolean(url && anon);

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!SUPA_CONFIGURED) return null;
  if (!client) client = createClient(url!, anon!, { auth: { persistSession: false } });
  return client;
}

/** Exact-article lookup for the article viewer (no embedding needed). */
export async function fetchArticulo(codigo: string, articulo: string): Promise<Article | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("leyes_articulos")
    .select("codigo, full_code, rama, articulo, texto, source")
    .eq("codigo", codigo)
    .eq("articulo", articulo)
    .maybeSingle();
  if (error || !data) return null;
  return {
    code: data.codigo,
    fullCode: data.full_code,
    article: data.articulo,
    heading: "",
    text: data.texto,
    source: data.source,
  };
}

export interface MatchedArticulo {
  codigo: string;
  full_code: string;
  rama: string;
  articulo: string;
  texto: string;
  source: string;
  similarity: number;
}

/** Semantic search via the `consultar` Edge Function (embeds query server-side). */
export async function consultarSemantica(
  query: string,
  opts: { rama?: string; codigos?: string[]; matchCount?: number } = {},
): Promise<MatchedArticulo[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c.functions.invoke("consultar", {
    body: {
      query,
      rama: opts.rama ?? null,
      codigos: opts.codigos ?? null,
      matchCount: opts.matchCount ?? 6,
    },
  });
  if (error || !data?.articulos) throw new Error(error?.message ?? "Sin resultados");
  return data.articulos as MatchedArticulo[];
}
