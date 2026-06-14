import type { CaseFileKind } from "./types";

export function kindFromName(name: string): CaseFileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  return "text";
}

export function fmtSize(bytes: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
