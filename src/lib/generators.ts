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
  | "denuncia" | "alegatos-penales" | "apelacion" | "amparo-indirecto";

export const DOC_LABELS: Record<DocKind, string> = {
  demanda: "Escrito inicial de demanda",
  contestacion: "Contestación de demanda",
  alegatos: "Alegatos",
  amparo: "Demanda de amparo",
  denuncia: "Denuncia / Querella por escrito",
  "alegatos-penales": "Escrito de Alegatos Iniciales",
  apelacion: "Recurso de Apelación",
  "amparo-indirecto": "Amparo Indirecto (Vinculación a Proceso)",
};

const BRANCH_DOC_KINDS: Partial<Record<BranchId, DocKind[]>> = {
  penal: ["denuncia", "alegatos-penales", "apelacion", "amparo-indirecto"],
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
  if (kind === "amparo-indirecto") return "JUEZ DE DISTRITO EN MATERIA DE AMPARO EN TURNO";
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

  if (kind === "amparo-indirecto") {
    return `
<p style="text-align:right"><strong>${authority}</strong><br/>P R E S E N T E.</p>
<p><strong>RUBRO:</strong> ${caseName || "Expediente sin número"}</p>
<p><strong>PROEMIO.</strong> El suscrito, [Nombre del Quejoso], por mi propio derecho, señalando como domicilio para oír y recibir notificaciones [Domicilio del Despacho], autorizando para tales efectos a los CC. Abogados [Nombre del Litigante], con el debido respeto comparezco a fin de promover <strong>${title}</strong> en contra de los actos que más adelante se precisan, cometidos en perjuicio de mi representado por las autoridades responsables, al tenor de los siguientes:</p>
<h2>A U T O R I D A D E S   R E S P O N S A B L E S</h2>
<p><strong>ORDENADORA:</strong> JUEZ DE CONTROL DEL DISTRITO JUDICIAL EN QUE SE SIGUE LA CAUSA PENAL [Número de Causa].</p>
<p><strong>EJECUTORA:</strong> AGENTE DEL MINISTERIO PÚBLICO ADSCRITO A LA MISMA CAUSA PENAL.</p>
<p><strong>ACTO RECLAMADO:</strong> El auto de vinculación a proceso dictado en fecha [Fecha del Auto] dentro de la causa penal [Número de Causa], seguida en contra del quejoso [Nombre del Imputado] por el delito de [Delito].</p>
<h2>P R E C E P T O S   C O N S T I T U C I O N A L E S   V I O L A D O S</h2>
<p>Se estiman transgredidos los derechos fundamentales previstos en los artículos <strong>14</strong> (garantía de audiencia y debido proceso), <strong>16</strong> (mandamiento escrito de autoridad competente, motivación y fundamentación), y <strong>19</strong> (requisitos del auto de vinculación a proceso) de la Constitución Política de los Estados Unidos Mexicanos, en relación con los diversos numerales 8 y 25 de la Convención Americana sobre Derechos Humanos.</p>
<h2>C O N C E P T O S   D E   V I O L A C I Ó N</h2>
<p><strong>PRIMERO. — Violación al artículo 16 constitucional por falta de motivación y fundamentación.</strong> El Juez de Control omitió expresar las razones que justifican la existencia de datos de prueba que establezcan la probable comisión del delito imputado, así como la probable intervención del quejoso en el mismo, toda vez que los elementos aportados por el Ministerio Público no reúnen el estándar mínimo exigido por el artículo 19 constitucional. La autoridad responsable se limitó a reproducir textualmente los argumentos de la representación social, sin realizar una valoración crítica e individualizada de los datos de prueba, vulnerando con ello las garantías de debido proceso y seguridad jurídica.</p>
<p><strong>SEGUNDO. — Violación al artículo 19 constitucional por ilegal vinculación a proceso.</strong> El auto reclamado no cumple con los requisitos formales y materiales que exige el artículo 19 de la Constitución Federal, en específico: (i) no se señaló el hecho que la ley señala como delito con la calidad de típico, antijurídico y culpable; (ii) no se expresaron los datos de prueba que establezcan la probable intervención del quejoso en los hechos; (iii) no se determinó el grado de intervención del imputado; y (iv) no se fijó el plazo de cierre de investigación complementaria, todo lo cual genera un estado de indefensión y debe ser reparado mediante la concesión del amparo.</p>
<p><strong>TERCERO. — Violación al artículo 14 constitucional por indebida subsunción de los hechos al tipo penal.</strong> La resolución reclamada realiza una incorrecta adecuación de las conductas al tipo penal atribuido, pues los elementos fácticos descritos por el Ministerio Público no actualizan todos los extremos del tipo penal que pretende imputarse al quejoso. Ello constituye una violación directa al principio de legalidad y tipicidad penal, que debe ser reparada mediante el presente juicio de amparo, para lo cual se solicita la inmediata libertad del quejoso al no cumplirse los extremos constitucionales.</p>
<h2>P U N T O S   P E T I T O R I O S</h2>
<p><strong>PRIMERO.</strong> Tenerme por presentado promoviendo Demanda de Amparo Indirecto en contra del auto de vinculación a proceso referido.</p>
<p><strong>SEGUNDO.</strong> Admitir la demanda, registrar el número de causa y solicitar el informe con justificación a las autoridades responsables.</p>
<p><strong>TERCERO.</strong> Señalar día y hora para la celebración de la audiencia incidental en la que se resuelva la suspensión del acto reclamado, solicitando desde ahora la suspensión provisional para el efecto de que el quejoso recobre su libertad mientras se resuelve el juicio constitucional.</p>
<p><strong>CUARTO.</strong> En su oportunidad, conceder el amparo y protección de la Justicia Federal al quejoso, ordenando la inmediata libertad del mismo y la reposición del procedimiento.</p>
<p style="margin-top:2rem">PROTESTO LO NECESARIO</p>
<p>Ciudad de México, a la fecha de su presentación.</p>
`.trim();
  }

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
