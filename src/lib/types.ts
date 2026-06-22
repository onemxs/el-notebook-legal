export type ThemeMode = "light" | "dark";

export type BranchId =
  | "penal"
  | "electoral"
  | "laboral"
  | "civil"
  | "mercantil"
  | "administrativo"
  | "fiscal"
  | "amparo"
  | "constitucional";

export interface Law {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
}

export interface LegalBranch {
  id: BranchId;
  name: string;
  tagline: string;
  laws: Law[];
  guideQuestions: string[];
}

/** A literal article as stored in the verified corpus (Supabase: leyes_articulos). */
export interface Article {
  code: string; // short code, e.g. "CPEUM"
  fullCode: string; // "Constitución Política de los Estados Unidos Mexicanos"
  article: string; // "16"
  heading: string;
  text: string;
  source: string; // provenance / last update
}

export interface Citation {
  id: string;
  code: string; // "CPEUM"
  article: string; // "16"
  label: string; // "CPEUM - Art. 16"
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: number;
  pending?: boolean;
}

export type CaseFileKind = "pdf" | "text" | "image" | "doc" | "video";

export interface CaseFile {
  id: string;
  name: string;
  kind: CaseFileKind;
  size: string;
  addedAt: number;
  analyzing?: boolean;
}

export type TimelineSeverity = "info" | "warning" | "deadline";

export interface TimelineInconsistency {
  id: string;
  tipo: "fechas" | "declaraciones";
  descripcion: string;
  severidad: "warning" | "error";
  eventos: string[]; // ids de los TimelineEvent involucrados
}

export interface TimelineEvent {
  id: string;
  date: string; // display date
  iso: string; // sortable; "" cuando la fecha no se pudo interpretar
  title: string;
  detail: string;
  severity: TimelineSeverity;
  source?: string; // documento del que proviene el hecho
}

export interface ExtractedField {
  label: string;
  value: string;
}

/** Un hecho fechado que extrae la IA, antes de enriquecerlo en el cliente (id/iso). */
export interface ExtractedEvent {
  date: string; // fecha tal como la da la IA, p. ej. "15 de mayo de 2025"
  title: string;
  detail: string;
  severity: TimelineSeverity;
}

/** Result of AI intake: reads a dropped expediente and proposes a case. */
export interface ExtractedCase {
  branch: BranchId;
  confidence: number; // 0..1
  caseName: string;
  asunto: string;
  parties: ExtractedField[];
  keyDates: ExtractedField[];
  summary: string;
  suggestedLaws: string[];
  cronologia?: ExtractedEvent[]; // hechos con fecha para la línea del tiempo
  transcripcion?: string; // texto del documento leído por la IA (opcional)
  source?: "ia" | "demo"; // procedencia del análisis
}

export interface VideoTranscription {
  id: string;
  fileName: string;
  duration: number;
  transcription: string;
  language: string;
  createdAt: number;
}

export type AppView = "dashboard" | "workspace" | "auditoria" | "escribania" | "configuracion";

export interface ContractAnalysis {
  riskScore: number; // 0 a 100
  pros: string[];
  cons: string[];
  strategy: string;
  criticalClauses: Array<{
    title: string;
    currentText: string;
    alternativeText: string;
  }>;
}

export interface CaseSummary {
  id: string;
  name: string;
  branch: BranchId;
  updated: string;
  deadlineLabel?: string;
  urgent?: boolean;
  demo?: boolean; // expediente de ejemplo: al abrirlo se hidrata con contenido ilustrativo
  archived?: boolean;
  asignadoA?: string; // nombre del abogado asignado (modo despacho)
  abogadoId?: string; // id del abogado asignado
}

export type ModelId = "rapido" | "profundo";

export interface SystemSettings {
  model: ModelId;
  temperature: number; // locked at 0.0
  secureSession: boolean; // borrado automático
  datasetUpdatedAt: string;
  accountMode: "abogado" | "despacho";
}
