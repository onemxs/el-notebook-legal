import type { BranchId, ExtractedCase } from "./types";
import { BACKEND_READY } from "./ai";

/**
 * AI intake: reads a dropped expediente, extracts general data and detects the
 * rama del derecho. Production reads the PDF text and classifies it via the Edge
 * Function; the demo path infers the branch from the filename and returns a
 * realistic, branch-specific extraction so the flow is fully usable offline.
 */
const DETECT: [RegExp, BranchId][] = [
  [/despid|laboral|trabajador|patr[óo]n|reinstal|salario|finiquito|cfe-rh/i, "laboral"],
  [/pagar[ée]|mercantil|ejecutiv|t[íi]tulo|cheque|factura|comercio|pagare/i, "mercantil"],
  [/amparo/i, "amparo"],
  [/penal|delito|imputad|fiscal[íi]a|querella|denuncia|carpeta/i, "penal"],
  [/sat|cr[ée]dito\s*fiscal|isr|iva|contribuci|fiscal/i, "fiscal"],
  [/arrendamiento|contrato|sucesi|divorcio|alimentos|civil|pagar[ée]\s*civil/i, "civil"],
  [/administrativ|multa|sanci[óo]n|tfja|nulidad|resoluci[óo]n/i, "administrativo"],
  [/electoral|ine|impugnaci[óo]n|candidat|comici/i, "electoral"],
  [/constituci|derechos\s*humanos|convencional|cpeum/i, "constitucional"],
];

function detectBranch(fileName: string): { branch: BranchId; confidence: number } {
  for (const [re, branch] of DETECT) {
    if (re.test(fileName)) return { branch, confidence: 0.92 + Math.random() * 0.06 };
  }
  return { branch: "civil", confidence: 0.71 };
}

type Template = Omit<ExtractedCase, "branch" | "confidence">;

const TEMPLATES: Record<BranchId, Template> = {
  laboral: {
    caseName: "Despido · Pérez vs. Comercializadora del Bajío",
    asunto: "Demanda laboral por despido injustificado",
    parties: [
      { label: "Actor (trabajador)", value: "Juan Pérez Hernández" },
      { label: "Demandado (patrón)", value: "Comercializadora del Bajío, S.A. de C.V." },
    ],
    keyDates: [
      { label: "Fecha de ingreso", value: "14 ene 2022" },
      { label: "Fecha de despido", value: "28 mar 2026" },
      { label: "Vence prescripción (art. 518)", value: "28 may 2026" },
    ],
    summary:
      "Trabajador separado sin aviso por escrito. Reclama reinstalación o indemnización constitucional, salarios vencidos y prestaciones. Plazo de 2 meses en curso.",
    suggestedLaws: ["LFT"],
  },
  mercantil: {
    caseName: "Juicio Ejecutivo Mercantil · pagaré vencido",
    asunto: "Acción cambiaria directa sobre pagaré",
    parties: [
      { label: "Actor (acreedor)", value: "Financiera Norte, S.A. de C.V." },
      { label: "Demandado (deudor)", value: "Distribuidora La Loma, S. de R.L." },
    ],
    keyDates: [
      { label: "Suscripción del pagaré", value: "03 feb 2025" },
      { label: "Fecha de vencimiento", value: "03 ago 2025" },
      { label: "Prescripción cambiaria (3 años)", value: "03 ago 2028" },
    ],
    summary:
      "Documento base es un pagaré que trae aparejada ejecución. Procede la vía ejecutiva mercantil; verificar requisitos de literalidad y autonomía del título.",
    suggestedLaws: ["Cód. Comercio", "LGTOC"],
  },
  amparo: {
    caseName: "Amparo indirecto · acto de autoridad",
    asunto: "Demanda de amparo indirecto",
    parties: [
      { label: "Quejoso", value: "María López Soto" },
      { label: "Autoridad responsable", value: "Director de Ingresos Municipales" },
    ],
    keyDates: [
      { label: "Notificación del acto", value: "02 abr 2026" },
      { label: "Vence plazo (15 días, art. 17)", value: "24 abr 2026" },
    ],
    summary:
      "Acto de autoridad que afecta la esfera jurídica del quejoso. Evaluar suspensión y principio de definitividad. Plazo de 15 días en curso.",
    suggestedLaws: ["Ley de Amparo", "CPEUM"],
  },
  penal: {
    caseName: "Carpeta de investigación · imputación",
    asunto: "Asunto penal — etapa de investigación",
    parties: [
      { label: "Imputado", value: "Carlos Ramírez Díaz" },
      { label: "Víctima / Ofendido", value: "Reservado" },
    ],
    keyDates: [
      { label: "Hechos", value: "15 mar 2026" },
      { label: "Detención / puesta a disposición", value: "16 mar 2026" },
    ],
    summary:
      "Verificar legalidad de la detención y el acto de molestia (art. 16 CPEUM), así como los datos de prueba para la vinculación a proceso.",
    suggestedLaws: ["CNPP", "CPF"],
  },
  fiscal: {
    caseName: "Crédito fiscal · resolución determinante",
    asunto: "Impugnación de crédito fiscal",
    parties: [
      { label: "Contribuyente", value: "Servicios Integrales GDL, S.A." },
      { label: "Autoridad", value: "SAT — Administración Desconcentrada" },
    ],
    keyDates: [
      { label: "Notificación de la resolución", value: "12 abr 2026" },
      { label: "Vence recurso (30 días)", value: "12 may 2026" },
    ],
    summary:
      "Resolución que determina crédito fiscal tras facultades de comprobación (art. 42 CFF). Evaluar recurso de revocación o juicio contencioso administrativo.",
    suggestedLaws: ["CFF", "LISR", "LIVA"],
  },
  civil: {
    caseName: "Controversia civil · cumplimiento de contrato",
    asunto: "Acción de cumplimiento / rescisión contractual",
    parties: [
      { label: "Actor", value: "Roberto Méndez Gómez" },
      { label: "Demandado", value: "Inmobiliaria Sur, S.A. de C.V." },
    ],
    keyDates: [
      { label: "Celebración del contrato", value: "10 ene 2025" },
      { label: "Incumplimiento", value: "20 feb 2026" },
    ],
    summary:
      "Contrato perfeccionado por consentimiento (art. 1796 CCF). Evaluar acción de cumplimiento forzoso o rescisión y la competencia por domicilio del demandado.",
    suggestedLaws: ["CCF"],
  },
  administrativo: {
    caseName: "Juicio de nulidad · sanción administrativa",
    asunto: "Nulidad de acto administrativo",
    parties: [
      { label: "Actor", value: "Constructora Peninsular, S.A." },
      { label: "Autoridad demandada", value: "Secretaría de Medio Ambiente" },
    ],
    keyDates: [
      { label: "Notificación del acto", value: "08 abr 2026" },
      { label: "Vence plazo (30 días)", value: "20 may 2026" },
    ],
    summary:
      "Acto administrativo presuntamente carente de debida fundamentación y motivación. Verificar definitividad antes del juicio ante el TFJA.",
    suggestedLaws: ["LFPA", "LOTFJA"],
  },
  electoral: {
    caseName: "Medio de impugnación electoral",
    asunto: "Impugnación en materia electoral",
    parties: [
      { label: "Promovente", value: "Partido / candidato promovente" },
      { label: "Autoridad responsable", value: "Consejo Electoral" },
    ],
    keyDates: [
      { label: "Acto impugnado", value: "12 abr 2026" },
      { label: "Vence plazo (4 días)", value: "16 abr 2026" },
    ],
    summary:
      "Plazo brevísimo de 4 días. Acreditar interés jurídico y definitividad de la cadena impugnativa; revisar afectación a principios rectores.",
    suggestedLaws: ["LGIPE", "LGSMIME"],
  },
  constitucional: {
    caseName: "Asunto constitucional · derechos humanos",
    asunto: "Defensa de derechos humanos",
    parties: [
      { label: "Promovente", value: "Persona titular del derecho" },
      { label: "Autoridad", value: "Autoridad señalada como responsable" },
    ],
    keyDates: [{ label: "Acto reclamado", value: "05 abr 2026" }],
    summary:
      "Identificar el derecho humano vulnerado y su fuente (CPEUM / tratado). Aplicar principio pro persona (art. 1º) y test de proporcionalidad.",
    suggestedLaws: ["CPEUM", "Tratados"],
  },
};

export const INTAKE_STEPS = [
  "Leyendo documento",
  "Extrayendo datos generales",
  "Detectando rama del derecho",
  "Preparando expediente",
] as const;

export async function analyzeExpediente(
  fileName: string,
  onProgress?: (stepIndex: number) => void,
  forceBranch?: BranchId,
): Promise<ExtractedCase> {
  for (let i = 0; i < INTAKE_STEPS.length; i++) {
    onProgress?.(i);
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 350));
  }

  if (BACKEND_READY) {
    // Production: PDF text extraction + classification via the Edge Function.
    // Falls through to the deterministic responder until wired.
  }

  // When enriching an existing case, keep the extraction consistent with its rama.
  // `source: "demo"` flags this as a fallback so the UI never presents the sample
  // data as if it were the real document's extraction.
  if (forceBranch) {
    return { branch: forceBranch, confidence: 0.95, source: "demo", ...TEMPLATES[forceBranch] };
  }
  const { branch, confidence } = detectBranch(fileName);
  return { branch, confidence, source: "demo", ...TEMPLATES[branch] };
}
