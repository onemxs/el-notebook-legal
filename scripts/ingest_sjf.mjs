#!/usr/bin/env node
/**
 * ingest_sjf.mjs — Ingesta EN VIVO desde la API pública del SJF (SCJN).
 *
 * Endpoint oficial (microservicio del buscador sjf2.scjn.gob.mx):
 *   · Búsqueda:  POST https://sjf2.scjn.gob.mx/services/sjftesismicroservice/api/public/tesis
 *                body: { searchTerms: [{ expression }], pageSize, pageNumber }
 *   · Detalle:   GET  .../api/public/tesis/{registro}   (rubro, texto íntegro, localización)
 *   El WAF exige User-Agent de navegador; sin él responde 403.
 *
 * Estrategia: expresiones fuertes por materia → prioriza jurisprudencias [J] y
 * épocas 10a/11a/12a → baja el texto íntegro por registro → upsert en `tesis`.
 *
 * Requiere (.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Uso: npm run tesis:sjf            (~2-4 min, pausas de cortesía de 150 ms)
 */

const SUPA = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env)");

const API = "https://sjf2.scjn.gob.mx/services/sjftesismicroservice/api/public/tesis";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Content-Type": "application/json",
  Referer: "https://sjf2.scjn.gob.mx/busqueda-principal-tesis",
  "Accept-Language": "es-MX,es;q=0.9",
};

/** Expresiones por materia. La API devuelve el criterio más relevante por
 * expresión, así que muchas expresiones específicas = amplia cobertura real. */
const BUSQUEDAS = {
  penal: [
    "prisión preventiva justificada", "presunción de inocencia", "cadena de custodia",
    "debido proceso penal", "legítima defensa", "auto de vinculación a proceso",
    "prueba ilícita", "reparación del daño víctima", "flagrancia detención",
    "individualización de la pena", "prescripción de la acción penal", "control de detención",
    "delito de portación de arma", "feminicidio", "tortura prueba", "libertad probatoria",
  ],
  civil: [
    "guarda y custodia", "pensión alimenticia", "responsabilidad civil", "prescripción adquisitiva",
    "nulidad de contrato", "compraventa lesión", "divorcio incausado", "reconocimiento de paternidad",
    "usucapión posesión", "arrendamiento desahucio", "daño moral", "interés superior del menor",
    "convivencia familiar", "sociedad conyugal", "acción reivindicatoria",
  ],
  laboral: [
    "despido injustificado", "salarios caídos", "ofrecimiento de trabajo", "relación de trabajo",
    "reinstalación", "prima de antigüedad", "subordinación laboral", "riesgo de trabajo",
    "reparto de utilidades", "jornada extraordinaria", "rescisión de la relación laboral",
    "carga de la prueba laboral", "trabajadores de confianza",
  ],
  mercantil: [
    "juicio ejecutivo mercantil", "título de crédito", "pagaré acción cambiaria", "concurso mercantil",
    "prescripción cambiaria", "endoso", "aval obligación", "interés moratorio mercantil",
    "contrato de comisión mercantil", "competencia mercantil", "sociedad mercantil",
  ],
  fiscal: [
    "crédito fiscal", "visita domiciliaria", "devolución de saldo a favor", "presunción de ingresos",
    "caducidad facultades comprobación", "determinación presuntiva", "recurso de revocación fiscal",
    "operaciones inexistentes 69-B", "responsabilidad solidaria fiscal", "embargo precautorio",
  ],
  amparo: [
    "interés legítimo amparo", "suspensión del acto reclamado", "amparo adhesivo", "suplencia de la queja",
    "principio de definitividad", "amparo directo procedencia", "acto reclamado", "causal de improcedencia",
    "efectos de la sentencia de amparo", "amparo contra leyes", "recurso de revisión amparo",
    "violaciones procesales amparo",
  ],
  constitucional: [
    "control de convencionalidad", "parámetro de regularidad constitucional", "principio pro persona",
    "derechos humanos restricción constitucional", "libertad de expresión", "igualdad y no discriminación",
    "derecho a la salud", "acceso a la justicia", "seguridad jurídica", "proporcionalidad test",
    "derecho de audiencia", "libre desarrollo de la personalidad",
  ],
  administrativo: [
    "responsabilidad administrativa", "procedimiento administrativo sancionador", "nulidad de resolución administrativa",
    "acto administrativo motivación", "silencio administrativo negativa ficta", "expropiación indemnización",
    "sanción administrativa proporcionalidad", "licencia permiso administrativo", "servicio público",
  ],
};

/** Registros de la semilla original — refrescarlos con el texto oficial. */
const SEMILLA = [2006224, 2006225, 160589, 2002000, 2007921];

const POR_EXPRESION = 8; // candidatos por búsqueda (se priorizan [J] y épocas recientes)
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const sinHtml = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** "[J]; 10a. Época; Pleno; Gaceta..." → { tipo, epoca, instancia } */
function parseLocalizacion(loc) {
  const s = String(loc ?? "");
  const tipo = /\[\s*J\s*\]/i.test(s) ? "jurisprudencia" : "aislada";
  const epoca = s.match(/(\d+a\.?\s*Época)/i)?.[1] ?? null;
  const partes = s.split(";").map((p) => p.trim());
  const instancia = partes.length > 2 ? partes[2] : null;
  return { tipo, epoca, instancia };
}

// La API devuelve el documento más relevante por expresión; paginamos por
// pageNumber para recoger varias tesis distintas de una misma expresión.
async function buscar(expression, paginas = 4) {
  const vistos = new Map();
  for (let p = 0; p < paginas; p++) {
    const r = await fetch(API, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ searchTerms: [{ expression }], pageNumber: p, pageSize: 20 }),
    });
    if (!r.ok) {
      if (p === 0) throw new Error(`búsqueda "${expression}": HTTP ${r.status}`);
      break;
    }
    const docs = (await r.json()).documents ?? [];
    for (const d of docs) if (d.ius && !vistos.has(d.ius)) vistos.set(d.ius, d);
    if (!docs.length) break;
    await pausa(120);
  }
  return [...vistos.values()];
}

async function detalle(ius) {
  const r = await fetch(`${API}/${ius}`, { headers: HEADERS });
  if (!r.ok) return null;
  return r.json();
}

// ── 1. recolectar candidatos por materia (prioriza [J] y épocas 10a/11a/12a) ──
const candidatos = new Map(); // ius → materia
for (const [materia, expresiones] of Object.entries(BUSQUEDAS)) {
  for (const exp of expresiones) {
    try {
      const docs = await buscar(exp);
      const moderna = (d) => /1[012]a\.?\s*Época/i.test(d.localizacion ?? "");
      const orden = [
        ...docs.filter((d) => /\[\s*J\s*\]/i.test(d.localizacion ?? "") && moderna(d)),
        ...docs.filter((d) => /\[\s*J\s*\]/i.test(d.localizacion ?? "") && !moderna(d)),
        ...docs.filter((d) => !/\[\s*J\s*\]/i.test(d.localizacion ?? "") && moderna(d)),
      ];
      let n = 0;
      for (const d of orden) {
        if (!d.ius || candidatos.has(d.ius)) continue;
        candidatos.set(d.ius, materia);
        if (++n >= POR_EXPRESION) break;
      }
      console.log(`  ${materia} · "${exp}" → +${n} (acum ${candidatos.size})`);
    } catch (e) {
      console.warn(`  ⚠ ${materia} · "${exp}": ${e.message}`);
    }
    await pausa(150);
  }
}
for (const ius of SEMILLA) if (!candidatos.has(ius)) candidatos.set(ius, "comun");
console.log(`Candidatos totales: ${candidatos.size}`);

// ── 2. bajar texto íntegro y armar filas ──
const filas = [];
let i = 0;
for (const [ius, materia] of candidatos) {
  i++;
  try {
    const t = await detalle(ius);
    if (!t?.ius || !t.rubro) continue;
    const { tipo, epoca, instancia } = parseLocalizacion(t.localizacion);
    const texto = sinHtml(t.texto);
    if (texto.length < 80) continue; // sin texto útil no sirve
    filas.push({
      registro: t.ius,
      clave: t.claveTesis ?? null,
      rubro: sinHtml(t.rubro),
      sintesis: texto.slice(0, 6000),
      tipo,
      epoca,
      instancia,
      materia,
      vigente: true,
    });
  } catch {
    /* siguiente */
  }
  if (i % 40 === 0) console.log(`  detalle ${i}/${candidatos.size} (filas: ${filas.length})`);
  await pausa(150);
}
console.log(`Filas listas: ${filas.length}`);

// ── 3. upsert en Supabase ──
for (let j = 0; j < filas.length; j += 200) {
  const lote = filas.slice(j, j + 200);
  const r = await fetch(`${SUPA}/rest/v1/tesis?on_conflict=registro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(lote),
  });
  if (!r.ok) throw new Error(`upsert lote ${j}: HTTP ${r.status} — ${await r.text()}`);
  console.log(`  upsert ${Math.min(j + 200, filas.length)}/${filas.length}`);
}

const porMateria = {};
for (const f of filas) porMateria[f.materia] = (porMateria[f.materia] ?? 0) + 1;
console.log("Ingesta SJF completa:", JSON.stringify(porMateria));
