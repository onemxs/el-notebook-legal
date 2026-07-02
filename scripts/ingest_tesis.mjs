#!/usr/bin/env node
/**
 * ingest_tesis.mjs — Ingesta del corpus jurisprudencial (tabla `tesis`).
 *
 * FUENTES OFICIALES (endpoints de conexión del Motor de Certeza Jurídica):
 *   · SJF / SCJN         https://sjf2.scjn.gob.mx
 *       - Buscador de tesis y jurisprudencias (Décima/Undécima Época y anteriores).
 *       - Detalle público por registro: https://sjf2.scjn.gob.mx/detalle/tesis/{registro}
 *       - Su API interna está tras Cloudflare (403 a clientes no-navegador):
 *         exporta los resultados desde la UI (JSON/Excel) y pásalos a este script,
 *         o córrelo desde un entorno de red permitido.
 *   · Buscador Jurídico  https://bj.scjn.gob.mx        (requiere token institucional)
 *   · CJF                https://www.cjf.gob.mx        (sentencias de Juzgados de
 *       Distrito y Tribunales Colegiados → tabla `cjf_sentencias`, misma mecánica)
 *   · Cámara de Diputados https://www.diputados.gob.mx/LeyesBiblio/
 *       (leyes federales vigentes — ya ingeridas en `leyes_articulos` vía corpus:build)
 *   · DOF                https://www.dof.gob.mx        (reformas y vigencias)
 *
 * Requiere (en .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   npm run tesis:ingest -- data/tesis.json
 *   # tesis.json = [{ registro, clave, rubro, sintesis, tipo, epoca, instancia, materia }]
 */
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];
if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env)");
if (!file) throw new Error("Uso: npm run tesis:ingest -- <archivo.json>");

const rows = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(rows)) throw new Error("El archivo debe ser un arreglo de tesis");

const valid = rows.filter(
  (t) =>
    Number.isInteger(t.registro) &&
    t.rubro &&
    (t.sintesis || t.texto) &&
    ["jurisprudencia", "aislada"].includes(t.tipo),
);
console.log(`Tesis válidas: ${valid.length} de ${rows.length}`);

// Upsert por registro vía PostgREST (lotes de 200).
for (let i = 0; i < valid.length; i += 200) {
  const batch = valid.slice(i, i + 200).map((t) => ({
    registro: t.registro,
    clave: t.clave ?? null,
    rubro: t.rubro,
    sintesis: t.sintesis ?? t.texto,
    tipo: t.tipo,
    epoca: t.epoca ?? null,
    instancia: t.instancia ?? null,
    materia: t.materia ?? "comun",
    vigente: t.vigente ?? true,
  }));
  const r = await fetch(`${url}/rest/v1/tesis?on_conflict=registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(batch),
  });
  if (!r.ok) throw new Error(`Lote ${i}: HTTP ${r.status} — ${await r.text()}`);
  console.log(`  · ${Math.min(i + 200, valid.length)}/${valid.length}`);
}
console.log("Ingesta completa.");
