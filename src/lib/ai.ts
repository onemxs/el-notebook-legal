import type { BranchId, Citation } from "./types";
import { getArticle } from "./corpus";
import { BRANCHES } from "./branches";
import { SUPA_CONFIGURED, authHeaders } from "./supabase";

/**
 * Assistant service. When authenticated, it answers via /api/asistente: a Claude
 * call grounded ONLY in the case file + RAG over the legal corpus (no inventing).
 * The "explorar sin cuenta" demo uses a deterministic, branch-aware responder so
 * it never spends the LLM on anonymous traffic.
 */
const cite = (code: string, article: string): Citation | null => {
  const found = getArticle(code, article);
  if (!found) return null;
  return { id: `${code}-${article}`, code: found.code, article: found.article, label: `${found.code} - Art. ${found.article}` };
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

function baseCitations(branch: BranchId): Citation[] {
  return BRANCH_BASE[branch].map(([c, a]) => cite(c, a)).filter((c): c is Citation => c !== null);
}

function composeAnswer(branch: BranchId, citations: Citation[]): string {
  const b = BRANCHES[branch];
  const refs = citations.map((c) => c.label).join(", ");
  return [
    `Analizando tu consulta bajo el marco **${b.name}** (${b.tagline}).`,
    "",
    citations.length
      ? `Los preceptos que rigen directamente el supuesto son ${refs}. Inicia sesión para que el asistente lea tu expediente y te responda con base en él.`
      : "Inicia sesión para que el asistente lea tu expediente y fundamente cada respuesta en el corpus legal.",
  ].join("\n");
}

export interface AssistantContext {
  branch: BranchId;
  enabledLaws: string[];
  fileCount: number;
  /** Case documents/transcripts — the assistant's source of facts. */
  docContent?: string[];
  /** Authenticated (not demo): use the real LLM+RAG endpoint. */
  cloud?: boolean;
}

export interface AssistantReply {
  content: string;
  citations: Citation[];
}

export async function askAssistant(query: string, ctx: AssistantContext): Promise<AssistantReply> {
  if (ctx.cloud && SUPA_CONFIGURED) {
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ query, branch: ctx.branch, docContent: ctx.docContent ?? [] }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.content) return { content: json.content, citations: json.citations ?? [] };
      }
    } catch {
      /* endpoint offline → deterministic fallback below */
    }
  }

  // Demo / offline: deterministic, branch-aware responder (no LLM spend).
  await new Promise((r) => setTimeout(r, 500));
  const citations = baseCitations(ctx.branch);
  return { content: composeAnswer(ctx.branch, citations), citations };
}

export const BACKEND_READY = SUPA_CONFIGURED;
