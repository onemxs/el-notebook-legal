// Auditoría de Vigencia Normativa: detecta citas de artículos en un escrito y
// las cruza contra el corpus oficial (leyes_articulos, fuente Cámara de
// Diputados) para señalar su estado: vigente · revisar · no localizado · derogado.
import { getSupabase } from "./supabase";

// Códigos reales del corpus y sus alias de redacción forense.
const ALIAS: [RegExp, string][] = [
  [/constituci[oó]n|constitucional|cpeum|carta magna/i, "CPEUM"],
  [/c[oó]digo nacional de procedimientos penales|cnpp/i, "CNPP"],
  [/c[oó]digo penal federal|cpf/i, "CPF"],
  [/c[oó]digo civil federal|ccf/i, "CCF"],
  [/c[oó]digo de comercio|c[oó]d\.?\s*comercio|ccom/i, "Cód. Comercio"],
  [/ley federal del trabajo|lft/i, "LFT"],
  [/c[oó]digo fiscal de la federaci[oó]n|cff/i, "CFF"],
  [/ley de amparo/i, "Ley de Amparo"],
];

export interface CitaDetectada {
  codigo: string;
  articulo: string;
  textoOriginal: string;
}

export type EstadoVigencia = "vigente" | "revisar" | "no_localizado" | "derogado";

export interface CitaAuditada extends CitaDetectada {
  estado: EstadoVigencia;
  nota: string;
}

// ponytail: regex simple — cubre «artículo 16 constitucional», «artículos 14 y 16
// de la CPEUM», «art. 1796 del Código Civil Federal» y sufijos Bis/Ter. Formas más
// barrocas (apartados, fracciones intercaladas) quedan para auditoría manual.
const RE_CITA =
  /art(?:[íi]culos?|\.)\s+(\d+(?:\s*(?:bis|ter))?(?:\s*(?:,|y|e)\s*\d+(?:\s*(?:bis|ter))?)*)\s*[o°º.]?\s*(?:,?\s*(?:del?|de\s+la|de\s+los)\s+)?([a-záéíóúñA-ZÁÉÍÓÚÑ.\s]{3,60}?)(?=[,;:()\n]|\s+(?:que|el|la|los|las|en|se|y)\s|\.|$)/gi;

function normalizaArticulo(raw: string): string {
  const m = raw.trim().match(/^(\d+)\s*(bis|ter)?$/i);
  if (!m) return raw.trim();
  const suf = m[2] ? ` ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}` : "";
  return `${m[1]}${suf}`;
}

export function extraerCitas(texto: string): CitaDetectada[] {
  const out = new Map<string, CitaDetectada>();
  for (const m of texto.matchAll(RE_CITA)) {
    const ley = m[2]?.trim() ?? "";
    const codigo = ALIAS.find(([re]) => re.test(ley))?.[1];
    if (!codigo) continue; // ley no identificada — fuera del alcance del auditor
    for (const num of m[1].split(/,|\by\b|\be\b/i)) {
      const articulo = normalizaArticulo(num);
      if (!/^\d/.test(articulo)) continue;
      out.set(`${codigo}|${articulo}`, {
        codigo,
        articulo,
        textoOriginal: m[0].trim().slice(0, 90),
      });
    }
  }
  return [...out.values()];
}

export async function auditarVigencia(citas: CitaDetectada[]): Promise<CitaAuditada[]> {
  const sb = getSupabase();
  if (!sb)
    return citas.map((c) => ({
      ...c,
      estado: "revisar",
      nota: "Sin conexión al corpus — verifica manualmente.",
    }));
  return Promise.all(
    citas.map(async (c): Promise<CitaAuditada> => {
      const { data } = await sb
        .from("leyes_articulos")
        .select("texto")
        .eq("codigo", c.codigo)
        .eq("articulo", c.articulo)
        .maybeSingle();
      if (!data)
        return {
          ...c,
          estado: "no_localizado",
          nota: "No localizado en el corpus oficial — verifícalo manualmente.",
        };
      const t: string = data.texto || "";
      if (/^\s*[-–.\s]*\(?\s*se\s+deroga/i.test(t))
        return { ...c, estado: "derogado", nota: "El texto oficial indica que está derogado." };
      if (/se\s+deroga|derogad[oa]/i.test(t))
        return {
          ...c,
          estado: "revisar",
          nota: "Vigente, pero contiene porciones derogadas — revisa la fracción citada.",
        };
      return { ...c, estado: "vigente", nota: "Localizado en el texto vigente del corpus oficial." };
    }),
  );
}
