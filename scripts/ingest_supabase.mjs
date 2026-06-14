#!/usr/bin/env node
/**
 * ingest_supabase.mjs — Genera embeddings de cada artículo y los sube a Supabase.
 *
 * Requiere (en .env o entorno):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY   (y opcional OPENAI_BASE_URL, EMBED_MODEL)
 *
 * Uso:
 *   node --env-file=.env scripts/ingest_supabase.mjs            # todo el corpus
 *   node --env-file=.env scripts/ingest_supabase.mjs --rama civil
 *   node --env-file=.env scripts/ingest_supabase.mjs --limit 50 # prueba rápida
 *
 * Es idempotente (upsert por codigo+articulo) y reanudable.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Carga .env de forma simple si no se usó --env-file
function loadDotenv() {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  OPENAI_BASE_URL = "https://api.openai.com/v1",
  EMBED_MODEL = "text-embedding-3-small",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error("Faltan variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const argRama = process.argv.includes("--rama")
  ? process.argv[process.argv.indexOf("--rama") + 1]
  : null;
const argLimit = process.argv.includes("--limit")
  ? Number(process.argv[process.argv.indexOf("--limit") + 1])
  : Infinity;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH = 96;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embed(texts) {
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function main() {
  let articulos = JSON.parse(readFileSync(resolve(ROOT, "data/leyes_articulos.json"), "utf8"));
  if (argRama) articulos = articulos.filter((a) => a.rama === argRama);
  articulos = articulos.slice(0, argLimit);

  console.log(`Indexando ${articulos.length} artículos · modelo ${EMBED_MODEL}\n`);
  let done = 0;
  for (let i = 0; i < articulos.length; i += BATCH) {
    const batch = articulos.slice(i, i + BATCH);
    const inputs = batch.map(
      (a) => `${a.fullCode} — Artículo ${a.articulo}.\n${a.texto}`.slice(0, 7000),
    );
    const vectors = await embed(inputs);
    const rows = batch.map((a, j) => ({
      codigo: a.codigo,
      full_code: a.fullCode,
      rama: a.rama,
      articulo: a.articulo,
      texto: a.texto,
      source: a.source,
      embedding: vectors[j],
    }));
    const { error } = await supabase
      .from("leyes_articulos")
      .upsert(rows, { onConflict: "codigo,articulo" });
    if (error) throw new Error(`Supabase upsert: ${error.message}`);
    done += batch.length;
    process.stdout.write(`\r  ${done}/${articulos.length} artículos indexados`);
    await sleep(120); // respeta rate limits
  }
  console.log(`\n\n✅ Corpus indexado en Supabase (${done} artículos).`);
}

main().catch((e) => {
  console.error("\n✖", e.message);
  process.exit(1);
});
