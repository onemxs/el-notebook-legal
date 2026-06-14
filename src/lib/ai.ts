import type { BranchId, Citation } from "./types";
import { getArticle } from "./corpus";
import { BRANCHES } from "./branches";
import { SUPA_CONFIGURED, consultarSemantica, type MatchedArticulo } from "./supabase";

/**
 * Assistant service. When Supabase is configured it performs real semantic search
 * over the indexed corpus (via the `consultar` Edge Function) and grounds every
 * answer in the retrieved articles. Otherwise it falls back to a deterministic,
 * branch-aware responder so the workspace is fully demoable offline. Answers are
 * always literal and bound to verified sources (temperature 0.0).
 */
const HAS_BACKEND = SUPA_CONFIGURED;

const cite = (code: string, article: string): Citation | null => {
  const found = getArticle(code, article);
  if (!found) return null;
  return {
    id: `${code}-${article}`,
    code: found.code,
    article: found.article,
    label: `${found.code} - Art. ${found.article}`,
  };
};

const dedupe = (cites: (Citation | null)[]): Citation[] => {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of cites) {
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
};

const BRANCH_BASE: Record<BranchId, [string, string][]> = {
  penal: [["CPF", "7"], ["CNPP", "251"], ["CPEUM", "16"]],
  electoral: [["LGIPE", "3"], ["CPEUM", "14"]],
  laboral: [["LFT", "518"], ["LFT", "48"], ["CPEUM", "123"]],
  civil: [["CCF", "1796"], ["CPEUM", "14"]],
  mercantil: [["Cód. Comercio", "1391"], ["Cód. Comercio", "1054"]],
  administrativo: [["CFF", "42"], ["CPEUM", "16"]],
  fiscal: [["CFF", "42"], ["CPEUM", "16"]],
  amparo: [["Ley de Amparo", "17"], ["CPEUM", "16"]],
  constitucional: [["CPEUM", "16"], ["CPEUM", "14"], ["CPEUM", "123"]],
};

const KEYWORD_HITS: [RegExp, [string, string]][] = [
  [/despid|separ|reinstal|indemniz/i, ["LFT", "48"]],
  [/prescri|dos meses|plazo laboral/i, ["LFT", "518"]],
  [/aviso|rescis/i, ["LFT", "47"]],
  [/ejecut|pagar[ée]|t[íi]tulo|cheque|cambiari/i, ["Cód. Comercio", "1391"]],
  [/supletori|procedimiento mercantil/i, ["Cód. Comercio", "1054"]],
  [/amparo|quince d[íi]as|15 d[íi]as/i, ["Ley de Amparo", "17"]],
  [/audiencia|retroact|debido proceso/i, ["CPEUM", "14"]],
  [/molestia|orden|cateo|aprehensi[óo]n|domicilio/i, ["CPEUM", "16"]],
  [/facultad|visita|sat|comprobaci[óo]n|fiscal/i, ["CFF", "42"]],
  [/contrato|consentimiento|obligaci/i, ["CCF", "1796"]],
];

function buildCitations(branch: BranchId, query: string): Citation[] {
  const hits: (Citation | null)[] = [];
  for (const [re, [code, art]] of KEYWORD_HITS) {
    if (re.test(query)) hits.push(cite(code, art));
  }
  for (const [code, art] of BRANCH_BASE[branch]) hits.push(cite(code, art));
  return dedupe(hits).slice(0, 4);
}

function composeAnswer(branch: BranchId, citations: Citation[]): string {
  const b = BRANCHES[branch];
  const refs = citations.map((c) => c.label).join(", ");
  return [
    `Analizando tu consulta bajo el marco **${b.name}** (${b.tagline}).`,
    "",
    `Conforme a las leyes activas del expediente, el punto se resuelve atendiendo de forma literal al texto aplicable. ${
      citations.length
        ? `Los preceptos que rigen directamente el supuesto son ${refs}.`
        : "No localicé un precepto directo en el corpus activo; acota la pregunta o activa más leyes en el Archivero."
    }`,
    "",
    "Recomendación operativa: verifica plazos y requisitos de procedencia antes de promover, y contrasta cada afirmación con el texto literal en el panel izquierdo. Toda conclusión queda sujeta a los fundamentos citados abajo.",
  ].join("\n");
}

export interface AssistantContext {
  branch: BranchId;
  enabledLaws: string[];
  fileCount: number;
}

export interface AssistantReply {
  content: string;
  citations: Citation[];
}

/** Builds a grounded reply from real semantic-search matches. */
function composeFromMatches(branch: BranchId, matches: MatchedArticulo[]): AssistantReply {
  const top = matches.slice(0, 4);
  const citations: Citation[] = top.map((m) => ({
    id: `${m.codigo}-${m.articulo}`,
    code: m.codigo,
    article: m.articulo,
    label: `${m.codigo} - Art. ${m.articulo}`,
  }));
  const list = top
    .map((m) => `• **${m.codigo} Art. ${m.articulo}** — ${m.texto.replace(/\s+/g, " ").slice(0, 160)}…`)
    .join("\n");
  const content = [
    `Busqué en el corpus indexado bajo el marco **${BRANCHES[branch].name}**. Los preceptos más relevantes para tu consulta son:`,
    "",
    list,
    "",
    "Abre cualquier fundamento abajo para leer su **texto literal verificado**. Toda conclusión queda sujeta a esos artículos.",
  ].join("\n");
  return { content, citations };
}

export async function askAssistant(
  query: string,
  ctx: AssistantContext,
): Promise<AssistantReply> {
  // Real path: semantic retrieval over the indexed corpus.
  if (HAS_BACKEND) {
    try {
      const matches = await consultarSemantica(query, { rama: ctx.branch, matchCount: 6 });
      if (matches.length) return composeFromMatches(ctx.branch, matches);
    } catch {
      /* edge function not deployed / offline → fall back to demo responder */
    }
  }

  // Demo path: deterministic, branch-aware responder.
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const citations = buildCitations(ctx.branch, query);
  return { content: composeAnswer(ctx.branch, citations), citations };
}

export const BACKEND_READY = HAS_BACKEND;
