export interface DocumentPayload {
  title: string;
  caseName: string;
  branchName: string;
  bodyHtml: string;
  signatureDataUrl?: string | null;
  signerName?: string;
  footer?: string;
}

/** Closing block with the autograph stamp, shared by print + Word output. */
function closingBlock(p: DocumentPayload): string {
  if (!p.signatureDataUrl) return "";
  return `
    <div style="margin-top:48px;text-align:center;page-break-inside:avoid">
      <img src="${p.signatureDataUrl}" alt="Firma autógrafa" style="max-height:120px;display:block;margin:0 auto 6px" />
      <div style="border-top:1px solid #1a202c;width:280px;margin:0 auto;padding-top:6px;font-size:13px">
        ${p.signerName || "Firma autógrafa del promovente"}
      </div>
    </div>`;
}

/** Full standalone HTML with judicial margins (wide left margin for binding). */
export function buildDocumentHtml(p: DocumentPayload): string {
  const footer = p.footer || `${p.caseName} · Materia ${p.branchName}`;
  return `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8" />
<title>${p.title}</title>
<style>
  @page { size: Letter; margin: 2.5cm 2.5cm 2.5cm 4cm; }
  body { font-family: 'Lora', Georgia, serif; font-size: 12pt; line-height: 1.6; color: #1a202c; }
  h1,h2,h3 { font-family: Arial, 'Helvetica Neue', sans-serif; }
  h2 { font-size: 13pt; letter-spacing: 2px; margin: 18px 0 8px; }
  p { margin: 0 0 12px; text-align: justify; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; }
  .meta { font-size: 9pt; color: #64748b; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 18px; }
  .foot { font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
</style></head>
<body>
  <div class="meta">${p.title.toUpperCase()} — ${p.caseName}</div>
  ${p.bodyHtml || "<p>[Documento sin contenido]</p>"}
  ${closingBlock(p)}
  <div class="foot">${footer}</div>
</body></html>`;
}

/** Export as a Word-openable .doc (HTML with Office namespaces). */
export function exportToWord(p: DocumentPayload): void {
  const html = buildDocumentHtml(p).replace(
    "<html lang=\"es-MX\">",
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' lang='es-MX'>",
  );
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  triggerDownload(blob, `${slug(p.title)}-${slug(p.caseName)}.doc`);
}

/** Export to PDF via the browser print pipeline (judicial @page margins). */
export function exportToPdf(p: DocumentPayload): void {
  const host = ensurePrintRoot();
  host.innerHTML = `
    <div style="padding:0">
      <div style="font-family:Lora,Georgia,serif;font-size:12pt;line-height:1.6;color:#1a202c">
        ${p.bodyHtml || "<p>[Documento sin contenido]</p>"}
        ${closingBlock(p)}
      </div>
    </div>`;
  const done = () => {
    host.innerHTML = "";
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

function ensurePrintRoot(): HTMLElement {
  let el = document.getElementById("print-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "print-root";
    document.body.appendChild(el);
  }
  return el;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "documento";
}
