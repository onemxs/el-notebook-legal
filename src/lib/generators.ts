import type { BranchId, CaseFile, TimelineEvent } from "./types";
import { BRANCHES } from "./branches";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * Timeline automation: derives an ordered chronology from the case files and flags
 * date contradictions and prescription deadlines. Demo logic produces a realistic
 * sequence; the production path analyzes the indexed documents.
 */
export function generateTimeline(branch: BranchId, files: CaseFile[]): TimelineEvent[] {
  const base = Date.now();
  const day = 86400000;
  const fileNote = files.length
    ? `${files.length} documento(s) del expediente analizado(s)`
    : "expediente sin archivos — cronología de referencia";

  const common: TimelineEvent[] = [
    {
      id: uid("ev"),
      date: "12 mar 2026",
      iso: new Date(base - day * 90).toISOString(),
      title: "Hecho generador",
      detail: `Se origina la controversia. ${fileNote}.`,
      severity: "info",
    },
    {
      id: uid("ev"),
      date: "28 mar 2026",
      iso: new Date(base - day * 74).toISOString(),
      title: "Notificación / acto de autoridad",
      detail: "Punto de partida para el cómputo de plazos procesales.",
      severity: "info",
    },
    {
      id: uid("ev"),
      date: "02 abr 2026",
      iso: new Date(base - day * 69).toISOString(),
      title: "Posible contradicción de fechas",
      detail:
        "Dos documentos reportan fechas distintas del mismo hecho. Revisar para evitar inconsistencias probatorias.",
      severity: "warning",
    },
  ];

  const deadlineByBranch: Record<BranchId, TimelineEvent> = {
    laboral: {
      id: uid("ev"),
      date: "28 may 2026",
      iso: new Date(base - day * 16).toISOString(),
      title: "⚠ Prescripción — 2 meses (art. 518 LFT)",
      detail: "Vence el plazo para ejercer la acción por separación. Promover de inmediato.",
      severity: "deadline",
    },
    amparo: {
      id: uid("ev"),
      date: "18 abr 2026",
      iso: new Date(base - day * 53).toISOString(),
      title: "⚠ Plazo de amparo — 15 días (art. 17)",
      detail: "Término para presentar la demanda de amparo desde la notificación.",
      severity: "deadline",
    },
    mercantil: {
      id: uid("ev"),
      date: "12 mar 2029",
      iso: new Date(base + day * 600).toISOString(),
      title: "⚠ Prescripción cambiaria — 3 años",
      detail: "Plazo de la acción cambiaria directa. Vigilar para no perder la vía ejecutiva.",
      severity: "deadline",
    },
    fiscal: {
      id: uid("ev"),
      date: "12 may 2026",
      iso: new Date(base - day * 32).toISOString(),
      title: "⚠ Plazo recurso de revocación — 30 días",
      detail: "Término para impugnar la resolución determinante del crédito fiscal.",
      severity: "deadline",
    },
    administrativo: {
      id: uid("ev"),
      date: "20 may 2026",
      iso: new Date(base - day * 24).toISOString(),
      title: "⚠ Juicio de nulidad — 30 días",
      detail: "Plazo para promover ante el TFJA. Verificar definitividad.",
      severity: "deadline",
    },
    penal: {
      id: uid("ev"),
      date: "15 abr 2026",
      iso: new Date(base - day * 56).toISOString(),
      title: "⚠ Plazo de impugnación",
      detail: "Término para recurrir la determinación. Confirmar cómputo con el CNPP.",
      severity: "deadline",
    },
    civil: {
      id: uid("ev"),
      date: "30 jun 2026",
      iso: new Date(base + day * 17).toISOString(),
      title: "⚠ Vencimiento contractual",
      detail: "Fecha límite pactada. Evaluar rescisión o cumplimiento forzoso.",
      severity: "deadline",
    },
    electoral: {
      id: uid("ev"),
      date: "16 abr 2026",
      iso: new Date(base - day * 55).toISOString(),
      title: "⚠ Medio de impugnación — 4 días",
      detail: "Plazo brevísimo en materia electoral. Promover sin demora.",
      severity: "deadline",
    },
    constitucional: {
      id: uid("ev"),
      date: "18 abr 2026",
      iso: new Date(base - day * 53).toISOString(),
      title: "⚠ Plazo de control constitucional",
      detail: "Verificar término aplicable según la vía elegida.",
      severity: "deadline",
    },
  };

  return [...common, deadlineByBranch[branch]].sort(
    (a, b) => +new Date(a.iso) - +new Date(b.iso),
  );
}

export type DocKind =
  | "demanda" | "contestacion" | "alegatos" | "amparo"
  | "denuncia" | "alegatos-penales" | "apelacion";

export const DOC_LABELS: Record<DocKind, string> = {
  demanda: "Escrito inicial de demanda",
  contestacion: "Contestación de demanda",
  alegatos: "Alegatos",
  amparo: "Demanda de amparo",
  denuncia: "Denuncia / Querella por escrito",
  "alegatos-penales": "Escrito de Alegatos Iniciales",
  apelacion: "Recurso de Apelación",
};

const BRANCH_DOC_KINDS: Partial<Record<BranchId, DocKind[]>> = {
  penal: ["denuncia", "alegatos-penales", "apelacion"],
};

const DEFAULT_DOC_KINDS: DocKind[] = ["demanda", "contestacion", "alegatos", "amparo"];

export function getDocKindsForBranch(branch: BranchId): DocKind[] {
  return BRANCH_DOC_KINDS[branch] ?? DEFAULT_DOC_KINDS;
}

/**
 * Renders a formal Mexican legal document skeleton (Rubro, Autoridad, Proemio,
 * Hechos, Derecho, Puntos Petitorios) as HTML for the editor surface.
 */
function resolveAuthority(branch: BranchId, kind: DocKind): string {
  if (branch === "penal") {
    if (kind === "denuncia") return "C. AGENTE DEL MINISTERIO PÚBLICO EN TURNO";
    if (kind === "apelacion") return "MAGISTRADO DEL TRIBUNAL DE ALZADA EN TURNO";
    return "C. JUEZ DE CONTROL EN TURNO";
  }
  if (branch === "amparo") return "JUEZ DE DISTRITO EN MATERIA DE AMPARO EN TURNO";
  if (branch === "laboral") return "TRIBUNAL LABORAL FEDERAL EN TURNO";
  if (branch === "fiscal" || branch === "administrativo")
    return "SALA REGIONAL DEL TRIBUNAL FEDERAL DE JUSTICIA ADMINISTRATIVA";
  return "C. JUEZ COMPETENTE EN TURNO";
}

export function generateDocument(
  kind: DocKind,
  branch: BranchId,
  caseName: string,
): string {
  const b = BRANCHES[branch];
  const authority = resolveAuthority(branch, kind);
  const title = DOC_LABELS[kind].toUpperCase();
  const law = b.laws[0];

  return `
<p style="text-align:right"><strong>${authority}</strong><br/>P R E S E N T E.</p>
<p><strong>RUBRO:</strong> ${caseName || "Expediente sin número"} — Materia ${b.name}.</p>
<p><strong>PROEMIO.</strong> El suscrito, en mi carácter de promovente y por mi propio derecho, con el debido respeto comparezco para exponer y, con fundamento en los artículos aplicables del ${law.name}, vengo a presentar <strong>${title}</strong> en los términos siguientes:</p>
<h2>H E C H O S</h2>
<p><strong>1.</strong> [Describa el primer hecho relevante, con fecha cierta y soporte documental del expediente.]</p>
<p><strong>2.</strong> [Continúe la narración cronológica de los hechos…]</p>
<h2>D E R E C H O</h2>
<p>Resultan aplicables las disposiciones del ${law.name} y, en lo conducente, los preceptos constitucionales que rigen el debido proceso. [Inserte aquí los fundamentos citados por el asistente.]</p>
<h2>P U N T O S   P E T I T O R I O S</h2>
<p><strong>PRIMERO.</strong> Tenerme por presentado en los términos del presente escrito.</p>
<p><strong>SEGUNDO.</strong> Acordar de conformidad lo solicitado, con fundamento en el derecho invocado.</p>
<p style="margin-top:2rem">PROTESTO LO NECESARIO</p>
<p>Ciudad de México, a la fecha de su presentación.</p>
`.trim();
}
