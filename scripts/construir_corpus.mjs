#!/usr/bin/env node
/**
 * construir_corpus.mjs — Descarga las leyes federales esenciales desde la fuente
 * oficial (Cámara de Diputados), las convierte a texto con `textutil` (macOS) y
 * las parte por artículo a un dataset estructurado: data/leyes_articulos.json
 *
 * No requiere credenciales. Es el paso de datos previo a la generación de
 * embeddings (ver ingest_supabase.mjs).
 *
 * Uso:
 *   node scripts/construir_corpus.mjs           # descarga (si falta) + parsea
 *   node scripts/construir_corpus.mjs --refetch # fuerza re-descarga
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = resolve(ROOT, "data/leyes_fuente");
const OUT = resolve(ROOT, "data/leyes_articulos.json");
const BASE = "https://www.diputados.gob.mx/LeyesBiblio/doc";
const REFETCH = process.argv.includes("--refetch");

/** Catálogo de leyes esenciales. `codigo` debe coincidir con las citas del asistente. */
const CATALOGO = [
  { file: "CPEUM", codigo: "CPEUM", rama: "constitucional", fullCode: "Constitución Política de los Estados Unidos Mexicanos" },
  { file: "LFT", codigo: "LFT", rama: "laboral", fullCode: "Ley Federal del Trabajo" },
  { file: "CCom", codigo: "Cód. Comercio", rama: "mercantil", fullCode: "Código de Comercio" },
  { file: "CFF", codigo: "CFF", rama: "fiscal", fullCode: "Código Fiscal de la Federación" },
  { file: "CCF", codigo: "CCF", rama: "civil", fullCode: "Código Civil Federal" },
  { file: "CNPP", codigo: "CNPP", rama: "penal", fullCode: "Código Nacional de Procedimientos Penales" },
  { file: "CPF", codigo: "CPF", rama: "penal", fullCode: "Código Penal Federal" },
  { file: "LAmp", codigo: "Ley de Amparo", rama: "amparo", fullCode: "Ley de Amparo, Reglamentaria de los Artículos 103 y 107 Constitucionales" },
];

const START_RE = /^Art[íi]culo\s+(\d+)\s*(?:o|º|°)?\.?-?\s*(Bis|Ter|Qu[aá]ter|Quintus|Sextus|S[eé]ptimus|Octavus|Nonus|Decimus)?/i;

function isMetadata(line) {
  const t = line.trim();
  if (!t) return false;
  if (/\b(reformad[oa]s?|adicionad[oa]s?|derogad[oa]s?|recorrid[oa]s?)\b.*\bDOF\b/i.test(t)) return true;
  if (/^Fe de erratas/i.test(t)) return true;
  if (/^(Denominaci[óo]n|Cap[íi]tulo|T[íi]tulo|Secci[óo]n|Apartado|P[áa]rrafo|Fracci[óo]n|Inciso)\b.*\bDOF\b/i.test(t)) return true;
  return false;
}

function normalizeNum(digits, suffix) {
  const cap = suffix ? " " + suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase() : "";
  return digits + cap;
}

function download(file) {
  const docPath = resolve(SRC_DIR, `${file}.doc`);
  const txtPath = resolve(SRC_DIR, `${file}.txt`);
  if (!existsSync(docPath) || REFETCH) {
    process.stdout.write(`  ↓ ${file}.doc … `);
    execFileSync("curl", ["-s", "--max-time", "120", "-L", "-o", docPath, `${BASE}/${file}.doc`]);
    console.log(`${(statSync(docPath).size / 1024 / 1024).toFixed(1)} MB`);
  }
  if (!existsSync(txtPath) || REFETCH) {
    execFileSync("textutil", ["-convert", "txt", docPath, "-output", txtPath, "-encoding", "UTF-8"]);
  }
  return readFileSync(txtPath, "utf8");
}

function parseLaw(txt, meta) {
  const lines = txt.split(/\r?\n/);
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(START_RE);
    if (m) starts.push({ i, num: normalizeNum(m[1], m[2]) });
  }
  const out = [];
  for (let k = 0; k < starts.length; k++) {
    const from = starts[k].i;
    const to = k + 1 < starts.length ? starts[k + 1].i : lines.length;
    const body = lines.slice(from, to).filter((l) => !isMetadata(l));
    let texto = body
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim()
      // quita el prefijo "Artículo N.-" de la primera línea (el número va aparte)
      .replace(START_RE, "")
      .replace(/^\s*[.\-–]\s*/, "")
      .trim();
    if (texto.length < 8) continue; // descarta falsos positivos vacíos
    out.push({
      codigo: meta.codigo,
      fullCode: meta.fullCode,
      rama: meta.rama,
      articulo: starts[k].num,
      texto,
      source: `${meta.fullCode} · DOF (Cámara de Diputados) · ${BASE}/${meta.file}.doc`,
    });
  }
  // de-dup por (codigo, articulo) conservando el primero
  const seen = new Set();
  return out.filter((a) => {
    const key = `${a.codigo}::${a.articulo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  mkdirSync(SRC_DIR, { recursive: true });
  console.log("Construyendo corpus legal (leyes federales esenciales)\n");
  const all = [];
  for (const meta of CATALOGO) {
    const txt = download(meta.file);
    const arts = parseLaw(txt, meta);
    console.log(`  ✓ ${meta.codigo.padEnd(14)} ${String(arts.length).padStart(4)} artículos  (${meta.fullCode})`);
    all.push(...arts);
  }
  writeFileSync(OUT, JSON.stringify(all, null, 0));
  const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ${all.length} artículos → data/leyes_articulos.json (${mb} MB)`);
}

main();
