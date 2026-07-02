// Exportación a .docx REAL (OOXML) sin dependencias: un .docx es un ZIP de XMLs.
// Empaquetamos con método STORE (sin compresión) — así no necesitamos ninguna
// librería de zip ni deflate; Word abre STORE sin problema.
//
// ponytail: la firma autógrafa gráfica NO se embebe (requeriría media + drawing
// OOXML); el .docx lleva la línea y el nombre del firmante para editar en Word,
// y la firma en imagen se conserva en el PDF. Subir a imagen embebida si se pide.
import type { DocumentPayload } from "./export";

// ── CRC-32 (requerido por el contenedor ZIP) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── ZIP (método STORE) ──
interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const enc = new TextEncoder();

/** Empaqueta archivos en un ZIP sin compresión y devuelve el Blob del .docx. */
export function zipStore(entries: ZipEntry[]): Blob {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) =>
    new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    // Local file header
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
      nameBytes, e.data,
    ]);
    chunks.push(local);

    // Central directory record
    central.push(
      concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length),
        u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
      ]),
    );
    offset += local.length;
  }

  const centralBlob = concat(central);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBlob.length), u32(offset), u16(0),
  ]);

  return new Blob([concat(chunks), centralBlob, end], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// ── HTML del editor → párrafos OOXML ──
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Un <w:r> (run) con negrita/cursiva opcionales. */
function run(text: string, bold: boolean, italic: boolean): string {
  if (!text) return "";
  const props = `${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}`;
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

/** Recorre un nodo acumulando runs, heredando negrita/cursiva de los padres. */
function runsFromNode(node: Node, bold: boolean, italic: boolean): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += run((child.textContent || "").replace(/\s+/g, " "), bold, italic);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") out += '<w:r><w:br/></w:r>';
      else {
        const b = bold || tag === "strong" || tag === "b";
        const i = italic || tag === "em" || tag === "i";
        out += runsFromNode(el, b, i);
      }
    }
  });
  return out;
}

/** Párrafo OOXML con estilo (heading/justificado/viñeta). */
function paragraph(runsXml: string, opts: { heading?: boolean; bullet?: boolean } = {}): string {
  if (!runsXml) return "<w:p/>";
  const jc = opts.heading ? "" : '<w:jc w:val="both"/>';
  const spacing = opts.heading
    ? '<w:spacing w:before="240" w:after="120"/>'
    : '<w:spacing w:after="160"/>';
  const ind = opts.bullet ? '<w:ind w:left="360" w:hanging="360"/>' : "";
  const pPr = `<w:pPr>${spacing}${jc}${ind}</w:pPr>`;
  const bullet = opts.bullet ? run("• ", false, false) : "";
  return `<w:p>${pPr}${bullet}${runsXml}</w:p>`;
}

/** Convierte el HTML del editor en cuerpo de párrafos OOXML. */
function bodyParagraphs(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "<w:p/>";
  const out: string[] = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").trim();
      if (t) out.push(paragraph(run(t, false, false)));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      el.querySelectorAll("li").forEach((li) =>
        out.push(paragraph(runsFromNode(li, false, false), { bullet: true })),
      );
    } else if (/^h[1-6]$/.test(tag)) {
      out.push(paragraph(runsFromNode(el, true, false), { heading: true }));
    } else {
      out.push(paragraph(runsFromNode(el, false, false)));
    }
  });
  return out.join("") || "<w:p/>";
}

function closingParagraphs(p: DocumentPayload): string {
  if (!p.signerName && !p.signatureDataUrl) return "";
  const name = p.signerName || "Firma autógrafa del promovente";
  return (
    paragraph(run("_______________________________", false, false), { heading: true }) +
    paragraph(run(name, true, false), { heading: true })
  );
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

/** Genera el Blob del .docx con márgenes de escrito judicial (carta, izq. amplia). */
export function buildDocx(p: DocumentPayload): Blob {
  const meta = paragraph(run(`${p.title.toUpperCase()} — ${p.caseName}`, true, false), {
    heading: true,
  });
  // Sección: carta (12240×15840 twips), margen izquierdo amplio para costura.
  const sectPr = `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="2267" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${meta}${bodyParagraphs(p.bodyHtml)}${closingParagraphs(p)}${sectPr}</w:body></w:document>`;

  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc.encode(RELS) },
    { name: "word/document.xml", data: enc.encode(document) },
  ]);
}
