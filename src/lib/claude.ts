import type { BranchId, ExtractedCase, ExtractedField } from "./types";
import { BRANCHES } from "./branches";
import { SUPA_CONFIGURED, consultarSemantica, type MatchedArticulo } from "./supabase";
import { DOC_LABELS, type DocKind } from "./generators";

/**
 * Sends a dropped document to the local /api/analizar proxy (which calls Claude
 * server-side). Returns a structured ExtractedCase, or null when Anthropic isn't
 * configured / the file type is unsupported / any error — so callers fall back to
 * the demo responder. The API key never reaches the browser.
 */
const IMG_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isDocx(file: File): boolean {
  return file.type === DOCX_TYPE || /\.docx$/i.test(file.name);
}

/**
 * Extracts the plain text of a Word (.docx) document in the browser via mammoth,
 * so it can be analyzed through the text path. Returns null if there's no usable
 * text (e.g. an empty or image-only doc). Old binary .doc is not supported.
 */
async function extractDocxText(file: File): Promise<string | null> {
  try {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = value.trim();
    return text.length ? text : null;
  } catch (e) {
    console.error("docx extract failed:", e);
    return null;
  }
}

function mediaTypeFor(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (["jpg", "jpeg"].includes(ext ?? "")) return "image/jpeg";
  if (["txt", "md"].includes(ext ?? "")) return "text/plain";
  return "application/octet-stream";
}

async function toBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function buildPayload(file: File) {
  // Word (.docx): extract the text in-browser and analyze it through the text path.
  if (isDocx(file)) {
    const text = await extractDocxText(file);
    return text ? { name: file.name, mediaType: "text/plain", text } : null;
  }
  const mediaType = mediaTypeFor(file);
  if (mediaType === "text/plain") {
    return { name: file.name, mediaType, text: await file.text() };
  }
  if (mediaType === "application/pdf" || IMG_TYPES.includes(mediaType)) {
    return { name: file.name, mediaType, base64: await toBase64(file) };
  }
  return null; // unsupported (e.g. old binary .doc) → fall back to demo
}

export interface DocGenContext {
  kind: DocKind;
  branch: BranchId;
  caseName: string;
  parties: ExtractedField[];
  facts: string[];
}

export async function generateDocumentAI(ctx: DocGenContext): Promise<string | null> {
  try {
    const b = BRANCHES[ctx.branch];
    let articles: MatchedArticulo[] = [];
    if (SUPA_CONFIGURED) {
      try {
        const query = `${DOC_LABELS[ctx.kind]} ${b.name} ${ctx.caseName}`;
        articles = await consultarSemantica(query, { rama: ctx.branch, matchCount: 6 });
      } catch { /* semantic search unavailable — proceed without articles */ }
    }

    const res = await fetch("/api/generar-documento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: ctx.kind,
        kindLabel: DOC_LABELS[ctx.kind],
        branch: ctx.branch,
        branchName: b.name,
        caseName: ctx.caseName,
        parties: ctx.parties,
        facts: ctx.facts,
        articles: articles.map((a) => ({
          codigo: a.codigo,
          articulo: a.articulo,
          texto: a.texto,
        })),
        lawName: b.laws[0]?.name ?? "",
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.html ? stripDocumentChrome(json.html) : null;
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth before the generated HTML is inserted via innerHTML: ensure it
 * is a body fragment, never a full document. A returned `<style>` with a `body{}`
 * rule would otherwise leak and restyle the whole app. Mirrors the server cleanup.
 */
function stripDocumentChrome(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const s = body ? body[1] : html;
  return s
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body|meta|title|link|base)\b[^>]*>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();
}

export async function analyzeDocument(
  file: File,
  forceBranch?: BranchId,
): Promise<ExtractedCase | null> {
  try {
    const payload = await buildPayload(file);
    if (!payload) {
      console.warn(
        `[analyzeDocument] "${file.name}" (${file.type || "tipo desconocido"}) no es un formato legible (PDF, imagen, texto o .docx). Se usarán datos de ejemplo.`,
      );
      return null;
    }
    const res = await fetch("/api/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, forceBranch: forceBranch ?? null }),
    });
    if (!res.ok) {
      console.error(
        `[analyzeDocument] /api/analizar respondió HTTP ${res.status}. ¿El endpoint/servidor está activo? Se usarán datos de ejemplo.`,
      );
      return null;
    }
    const json = await res.json();
    if (json?.error) {
      console.error(
        `[analyzeDocument] La IA devolvió un error: ${json.error}. Se usarán datos de ejemplo.`,
      );
      return null;
    }
    if (!json?.branch) {
      console.error(
        "[analyzeDocument] La respuesta no trae 'branch' (posible JSON truncado o vacío). Se usarán datos de ejemplo.",
      );
      return null;
    }
    return json as ExtractedCase;
  } catch (e) {
    console.error(
      "[analyzeDocument] Falló el análisis (red o excepción no controlada):",
      e,
    );
    return null;
  }
}
