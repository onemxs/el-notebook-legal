import type { BranchId, ExtractedCase } from "./types";

/**
 * Sends a dropped document to the local /api/analizar proxy (which calls Claude
 * server-side). Returns a structured ExtractedCase, or null when Anthropic isn't
 * configured / the file type is unsupported / any error — so callers fall back to
 * the demo responder. The API key never reaches the browser.
 */
const IMG_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

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
  const mediaType = mediaTypeFor(file);
  if (mediaType === "text/plain") {
    return { name: file.name, mediaType, text: await file.text() };
  }
  if (mediaType === "application/pdf" || IMG_TYPES.includes(mediaType)) {
    return { name: file.name, mediaType, base64: await toBase64(file) };
  }
  return null; // unsupported (e.g. .docx) → fall back to demo
}

export async function analyzeDocument(
  file: File,
  forceBranch?: BranchId,
): Promise<ExtractedCase | null> {
  try {
    const payload = await buildPayload(file);
    if (!payload) return null;
    const res = await fetch("/api/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, forceBranch: forceBranch ?? null }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error || !json?.branch) return null;
    return json as ExtractedCase;
  } catch {
    return null;
  }
}
