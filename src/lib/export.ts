import type { TimelineEvent, TimelineInconsistency } from "./types";

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

/** Timeline severity label in Spanish */
const SEV_LABEL: Record<string, string> = {
  info: "Hecho",
  warning: "Contradicción",
  deadline: "Plazo",
};

/** Build the header block for a chronology report (firm branding + case data). */
function reportHeaderHtml(caseName: string, branchName: string): string {
  // ponytail: static firm branding; replace with DB org name when organization settings are available
  return `
  <div style="border-bottom:2px solid #1E3A5F;padding-bottom:18px;margin-bottom:22px;display:flex;align-items:center;gap:16px">
    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#1E3A5F,#2a5a8a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900;font-family:Arial,sans-serif">P</div>
    <div>
      <div style="font-family:Arial,'Helvetica Neue',sans-serif;font-size:15pt;font-weight:700;color:#1E3A5F;letter-spacing:-0.3px">PasantIA · Despacho Legal</div>
      <div style="font-size:8.5pt;color:#64748b;margin-top:2px">Reporte de Cronología — ${caseName}</div>
      <div style="font-size:8pt;color:#94a3b8;margin-top:1px">Materia ${branchName}</div>
    </div>
  </div>`;
}

/** Print a premium timeline report directly from the data, without relying on DOM state. */
export function exportarReporteCronologia(
  caseName: string,
  branchName: string,
  events: TimelineEvent[],
  inconsistencies: TimelineInconsistency[],
): void {
  const rows = events
    .map(
      (e) => `
    <tr>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:9pt;white-space:nowrap;vertical-align:top">${e.date}</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:9pt;vertical-align:top">
        <span style="display:inline-block;padding:1px 7px;border-radius:10px;font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:0.5px${
          e.severity === "deadline" ? ";background:#fef2f2;color:#dc2626" : e.severity === "warning" ? ";background:#fffbeb;color:#d97706" : ";background:#eff6ff;color:#2563eb"
        }">${SEV_LABEL[e.severity] || e.severity}</span>
      </td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:9pt;vertical-align:top;font-weight:600">${e.title}</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:9pt;vertical-align:top;color:#475569">${e.detail}${e.source ? `<br><span style="font-size:7.5pt;color:#94a3b8">${e.source}</span>` : ""}</td>
    </tr>`,
    )
    .join("");

  const incBadges = inconsistencies
    .map((inc) => {
      const color = inc.severidad === "error" ? "#dc2626" : "#d97706";
      const bg = inc.severidad === "error" ? "#fef2f2" : "#fffbeb";
      return `<div style="margin-bottom:8px;padding:8px 12px;border-left:3px solid ${color};background:${bg};border-radius:4px;font-size:8.5pt;color:#1e293b"><strong style="color:${color}">${inc.severidad === "error" ? "⚠" : "⚡"} ${inc.tipo === "fechas" ? "Inconsistencia de fechas" : "Contradicción"}:</strong> ${inc.descripcion}</div>`;
    })
    .join("");

  const host = ensurePrintRoot();
  host.innerHTML = `
    <style>
      @page { size: landscape; margin: 1.8cm 1.8cm 1.8cm 2.5cm; }
      body { font-family: 'Lora', Georgia, serif; font-size: 10pt; line-height: 1.5; color: #1a202c; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { padding: 8px 10px; border: 1px solid #cbd5e1; background: #f1f5f9; font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
      td { padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 9pt; }
      .foot { font-size: 7pt; color: #94a3b8; text-align: center; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
    ${reportHeaderHtml(caseName, branchName)}
    ${incBadges ? `<div style="margin-bottom:16px">${incBadges}</div>` : ""}
    <table>
      <thead>
        <tr>
          <th style="width:14%">Fecha</th>
          <th style="width:12%">Tipo</th>
          <th style="width:28%">Hito</th>
          <th style="width:46%">Detalle</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">Generado por PasantIA · ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} · ${caseName}</div>`;
  const done = () => { host.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
}

/** Export a transcription text as a clean, printable PDF. */
export function exportarTranscripcion(title: string, text: string): void {
  const host = ensurePrintRoot();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 6px;font-size:10pt;line-height:1.7;text-align:justify">${l}</p>`)
    .join("");
  host.innerHTML = `
    <style>
      @page { size: Letter; margin: 2.5cm; }
      body { font-family: 'Lora', Georgia, serif; font-size: 10pt; line-height: 1.6; color: #1a202c; }
      h1 { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 13pt; letter-spacing: 1px; margin: 0 0 4px; color: #1E3A5F; }
      .meta { font-size: 8pt; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; }
    </style>
    <h1>${title}</h1>
    <div class="meta">Transcripción generada por PasantIA · ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
    ${lines || "<p>[Sin contenido]</p>"}
    <div class="foot" style="font-size:7pt;color:#94a3b8;text-align:center;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:4px">Documento generado por PasantIA</div>`;
  const done = () => { host.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
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
