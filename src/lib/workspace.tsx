import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppView,
  BranchId,
  CaseFile,
  CaseSummary,
  ChatMessage,
  Citation,
  ContractAnalysis,
  ExtractedCase,
  ExtractedField,
  Law,
  SystemSettings,
  TimelineEvent,
  TimelineInconsistency,
  TimelineSeverity,
} from "./types";
import { BRANCHES } from "./branches";
import { askAssistant } from "./ai";
import { analyzeExpediente } from "./intake";
import { analyzeDocument, generateDocumentAI } from "./claude";
import { kindFromName } from "./files";
import { generateTimeline, generateDocument, getDocKindsForBranch, type DocKind } from "./generators";
import { useAuth } from "./auth";
import {
  crearCaso,
  obtenerCasos,
  obtenerDocumentosCaso,
  obtenerTimelineCaso,
  obtenerMensajesCaso,
  guardarDocumento,
  guardarTimelineEventos,
  guardarMensajeChat,
  archiveCaso,
  borrarCaso,
  type CasoRow,
} from "./supabase";
import { listarMiembros, type Miembro } from "./invites";

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

// CaseFile kind → documentos.tipo
const KIND_TO_TIPO: Record<string, "pdf" | "video" | "transcription" | "text" | "image"> = {
  pdf: "pdf",
  image: "image",
  video: "video",
  text: "text",
  doc: "text",
};

/** Relative "updated" label from an ISO timestamp, for cloud case cards. */
function relativo(iso?: string): string {
  if (!iso) return "ahora";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "ahora";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return `hace ${Math.floor(d / 7)} sem`;
}

const cloneLaws = (id: BranchId): Law[] => BRANCHES[id].laws.map((l) => ({ ...l }));

interface WorkspaceState {
  view: AppView;
  cases: CaseSummary[];
  recentCases: CaseSummary[];
  members: Miembro[];
  caseAction: { mode: "archive" | "delete"; caseId: string; caseName: string } | null;
  caseModalOpen: boolean;
  caseModalPreset: BranchId | null;
  intakeFile: File | null;
  branch: BranchId;
  caseName: string;
  caseIsDemo: boolean;
  laws: Law[];
  files: CaseFile[];
  messages: ChatMessage[];
  thinking: boolean;
  timeline: TimelineEvent[] | null;
  timelineLoading: boolean;
  inconsistencies: TimelineInconsistency[];
  editorHtml: string;
  editorVersion: number;
  activeArticle: Citation | null;
  settings: SystemSettings;
  generatingDoc: boolean;
  caseParties: ExtractedField[];
  caseDocContent: string[];
  activeAnalysis: ContractAnalysis | null;
  analysisLoading: boolean;
  selectedTemplate: string | null;
  documentPreview: string;
  docGenLoading: boolean;
}

interface WorkspaceCtx extends WorkspaceState {
  setView: (v: AppView) => void;
  goHome: () => void;
  openCase: (id: string) => void;
  openCaseModal: (preset?: BranchId) => void;
  closeCaseModal: () => void;
  startIntake: (file: File) => void;
  clearIntake: () => void;
  startCase: (branch: BranchId, name: string, extraction?: ExtractedCase, abogadoId?: string) => Promise<string>;
  toggleLaw: (lawId: string) => void;
  addFiles: (files: CaseFile[]) => void;
  addTranscript: (fileName: string, text: string) => void;
  ingestDocument: (file: File) => void;
  seedFromExtraction: (fileName: string, res: ExtractedCase) => void;
  removeFile: (id: string) => void;
  sendMessage: (text: string) => void;
  runTimeline: () => void;
  clearTimeline: () => void;
  getTranscriptContent: (fileName: string) => string | undefined;
  inconsistencies: TimelineInconsistency[];
  openArticle: (c: Citation) => void;
  closeArticle: () => void;
  setEditorHtml: (html: string) => void;
  insertDocument: (kind: DocKind) => void;
  docKindsForBranch: DocKind[];
  updateSettings: (patch: Partial<SystemSettings>) => void;
  archiveCase: (id: string) => void;
  deleteCase: (id: string) => void;
  setCaseAction: (action: { mode: "archive" | "delete"; caseId: string; caseName: string } | null) => void;
  activeCases: CaseSummary[];
  archivedCases: CaseSummary[];
  isDespacho: boolean;
  analyzeContract: (file: File) => void;
  generateCustomDocument: (templateId: string, variables: Record<string, string>, notes: string) => void;
  setSelectedTemplate: (id: string | null) => void;
  systemUsage: { iaCreditsUsed: number; iaCreditsLimit: number; localAudioMinutesUsed: number; localAudioMinutesLimit: number };
}

const Ctx = createContext<WorkspaceCtx | null>(null);

const DEFAULT_BRANCH: BranchId = "mercantil";

const initialSettings: SystemSettings = {
  model: "profundo",
  temperature: 0,
  secureSession: false,
  datasetUpdatedAt: "10 jun 2026",
  accountMode: "abogado",
};

const welcomeMessage = (branch: BranchId): ChatMessage => ({
  id: uid("m"),
  role: "assistant",
  content: `Listo para trabajar en materia **${BRANCHES[branch].name}**. Usa las Guías Rápidas para las preguntas críticas del caso, o escríbeme tu consulta. Cada respuesta incluirá su Sustento Legal con fundamentos verificables.`,
  timestamp: Date.now(),
});

const MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
};

/** Normalize a word to its 3-letter, accent-free month key ("mayo" → "may"). */
const monthKey = (w: string) =>
  w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().slice(0, 3);

/**
 * Parse the many date shapes the AI (or a document) may use into a timestamp:
 * "15 de mayo de 2025", "15 mayo 2025", "15 may 2026", "15/05/2025",
 * "2025-05-15", or "mayo de 2025". Returns NaN when nothing matches.
 */
function parseSpanishDate(v: string): number {
  const s = v.toLowerCase().trim();

  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();

  const num = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (num) {
    const year = +num[3] < 100 ? 2000 + +num[3] : +num[3];
    return new Date(year, +num[2] - 1, +num[1]).getTime();
  }

  const dmy = s.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\.?\s*(?:de\s+)?(\d{4})/);
  if (dmy) {
    const month = MONTHS[monthKey(dmy[2])];
    if (month !== undefined) return new Date(+dmy[3], month, +dmy[1]).getTime();
  }

  const my = s.match(/([a-záéíóú]+)\.?\s*(?:de\s+)?(\d{4})/);
  if (my) {
    const month = MONTHS[monthKey(my[1])];
    if (month !== undefined) return new Date(+my[2], month, 1).getTime();
  }
  return NaN;
}

/** Display date → sortable ISO, or "" when the date can't be interpreted. */
function toIso(raw: string): string {
  const t = parseSpanishDate(raw);
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
}

/** Chronological order; events with no parseable date sink to the bottom. */
function byChrono(a: TimelineEvent, b: TimelineEvent): number {
  if (!a.iso && !b.iso) return 0;
  if (!a.iso) return 1;
  if (!b.iso) return -1;
  return +new Date(a.iso) - +new Date(b.iso);
}

const DEADLINE_RE = /vence|prescrip|plazo|t[ée]rmino|recurso|caduc|vencimiento/i;

/** Turn an extracted key-date into a timeline event (deadlines flagged). */
function fieldToEvent(field: ExtractedField, fileName: string): TimelineEvent {
  return {
    id: uid("de"),
    date: field.value,
    iso: toIso(field.value),
    title: field.label,
    detail: `Dato extraído de ${fileName}.`,
    severity: DEADLINE_RE.test(field.label) ? "deadline" : "info",
    source: fileName,
  };
}

const VALID_SEV: TimelineSeverity[] = ["info", "warning", "deadline"];

/**
 * Build timeline events from an AI extraction: prefer the narrative `cronologia`,
 * and fall back to the labelled key-dates when the model didn't return one.
 */
function eventsFromExtraction(res: ExtractedCase, fileName: string): TimelineEvent[] {
  if (res.cronologia && res.cronologia.length) {
    return res.cronologia.map((e) => ({
      id: uid("ev"),
      date: e.date,
      iso: toIso(e.date),
      title: e.title,
      detail: e.detail,
      severity: VALID_SEV.includes(e.severity) ? e.severity : "info",
      source: fileName,
    }));
  }
  return res.keyDates.map((d) => fieldToEvent(d, fileName));
}

/** Merge new events into existing ones, de-duping by day + title, kept sorted. */
function mergeEvents(prev: TimelineEvent[], next: TimelineEvent[]): TimelineEvent[] {
  const key = (e: TimelineEvent) => `${e.iso.slice(0, 10)}|${e.title.trim().toLowerCase()}`;
  const seen = new Set(prev.map(key));
  const merged = [...prev];
  for (const e of next) {
    if (!seen.has(key(e))) {
      seen.add(key(e));
      merged.push(e);
    }
  }
  return merged.sort(byChrono);
}

function ingestMessage(fileName: string, res: ExtractedCase): ChatMessage {
  const partes = res.parties.map((p) => `${p.label}: ${p.value}`).join("; ");
  const fechas = res.keyDates.map((d) => `${d.label}: ${d.value}`).join("; ");
  return {
    id: uid("m"),
    role: "assistant",
    content: [
      `Analicé **${fileName}** y lo añadí al expediente. Estos son los datos generales que extraje:`,
      "",
      `**Asunto:** ${res.asunto}`,
      `**Partes:** ${partes}`,
      `**Fechas clave:** ${fechas}`,
      "",
      res.summary,
      "",
      "Incorporé las fechas a la Línea del Tiempo. ¿Quieres que verifique contradicciones o plazos de prescripción?",
    ].join("\n"),
    timestamp: Date.now(),
  };
}

/**
 * Example cases shown on the dashboard so lawyers can see how the system works.
 * Flagged `demo: true` — opening one hydrates the workspace with illustrative
 * documents and an auto-generated timeline. Real cases never carry this flag.
 */
const SEED_CASES: CaseSummary[] = [
  {
    id: "c-demo-1",
    name: "Juicio Ejecutivo Mercantil 482/2026",
    branch: "mercantil",
    updated: "hace 2 horas",
    deadlineLabel: "Prescripción cambiaria · 3 años",
    demo: true,
  },
  {
    id: "c-demo-2",
    name: "Despido · García vs. Industrias del Norte",
    branch: "laboral",
    updated: "ayer",
    deadlineLabel: "Prescripción 2 meses (art. 518)",
    urgent: true,
    demo: true,
  },
  {
    id: "c-demo-3",
    name: "Amparo indirecto 211/2026",
    branch: "amparo",
    updated: "hace 3 días",
    deadlineLabel: "Plazo 15 días (art. 17)",
    urgent: true,
    demo: true,
  },
  {
    id: "c-demo-4",
    name: "Revisión de contrato de arrendamiento",
    branch: "civil",
    updated: "hace 1 semana",
    demo: true,
  },
];

const DEMO_DOCS: Partial<Record<BranchId, string[]>> = {
  mercantil: ["Pagaré 482-2026.pdf", "Estado de cuenta.pdf", "Requerimiento de pago.pdf"],
  laboral: ["Demanda laboral.pdf", "Recibos de nómina.pdf", "Aviso de despido.pdf"],
  amparo: ["Demanda de amparo.pdf", "Acto reclamado.pdf", "Notificación.pdf"],
  civil: ["Contrato de arrendamiento.pdf", "Notificación de incumplimiento.pdf"],
};

/** Sample documents for a demo expediente's archivero. */
function demoFiles(branch: BranchId): CaseFile[] {
  const names = DEMO_DOCS[branch] ?? ["Escrito inicial.pdf", "Pruebas documentales.pdf"];
  return names.map((name, i) => ({
    id: `demo-f-${branch}-${i}`,
    name,
    kind: kindFromName(name),
    size: "expediente",
    addedAt: Date.now() - i * 60000,
  }));
}

/** Short note shown in a demo case explaining it's an illustrative example. */
const demoNote = (): ChatMessage => ({
  id: uid("m"),
  role: "assistant",
  content:
    "📁 **Expediente de ejemplo.** Así se ve un caso ya armado: documentos en el Archivero y la **Línea del Tiempo** generada automáticamente con los hechos y plazos. Abre la pestaña «Línea del Tiempo» para verla. Crea un expediente nuevo (arrastra un documento) para trabajar uno real.",
  timestamp: Date.now(),
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session, demo } = useAuth();
  // Cloud-backed when authenticated (not the "explorar sin cuenta" demo mode).
  const cloud = !!session && !demo;
  const cloudRef = useRef(cloud);
  cloudRef.current = cloud;
  // Supabase id of the open case (null in demo/local). Set synchronously via the
  // ref so persistence side-effects fire against the right case immediately.
  const currentCaseIdRef = useRef<string | null>(null);

  const [view, setView] = useState<AppView>("dashboard");
  const [cases, setCases] = useState<CaseSummary[]>(SEED_CASES);
  const [recentCases, setRecentCases] = useState<CaseSummary[]>([]);
  const [caseAction, setCaseAction] = useState<{
    mode: "archive" | "delete";
    caseId: string;
    caseName: string;
  } | null>(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseModalPreset, setCaseModalPreset] = useState<BranchId | null>(null);
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [branch, setBranch] = useState<BranchId>(DEFAULT_BRANCH);
  const [caseName, setCaseName] = useState("Expediente de demostración");
  const [caseIsDemo, setCaseIsDemo] = useState(false);
  const [laws, setLaws] = useState<Law[]>(() => cloneLaws(DEFAULT_BRANCH));
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcomeMessage(DEFAULT_BRANCH),
  ]);
  const [thinking, setThinking] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [inconsistencies, setInconsistencies] = useState<TimelineInconsistency[]>([]);
  const [ingestedEvents, setIngestedEvents] = useState<TimelineEvent[]>([]);
  const [editorHtml, setEditorHtmlState] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);
  const [activeArticle, setActiveArticle] = useState<Citation | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [systemUsage] = useState({
    iaCreditsUsed: 42000,
    iaCreditsLimit: 100000,
    localAudioMinutesUsed: 90,
    localAudioMinutesLimit: 180,
  });
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [caseParties, setCaseParties] = useState<ExtractedField[]>([]);
  const [caseDocContent, setCaseDocContent] = useState<string[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<ContractAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState("");
  const [docGenLoading, setDocGenLoading] = useState(false);
  const [members, setMembers] = useState<Miembro[]>([]);

  const filesRef = useRef(files);
  filesRef.current = files;
  const ingestedEventsRef = useRef(ingestedEvents);
  ingestedEventsRef.current = ingestedEvents;
  const transcriptMapRef = useRef<Map<string, string>>(new Map());
  const branchRef = useRef(branch);
  branchRef.current = branch;
  const caseDocContentRef = useRef(caseDocContent);
  caseDocContentRef.current = caseDocContent;

  // Case list: from Supabase when authenticated (RLS → own + despacho); the
  // "explorar sin cuenta" demo keeps the illustrative SEED_CASES.
  useEffect(() => {
    let active = true;
    if (cloud) {
      void (async () => {
        const [rows, team] = await Promise.all([obtenerCasos(), listarMiembros()]);
        if (!active) return;
        setMembers(team);
        const memberNames = new Map(team.map((m) => [m.id, m.nombre_completo]));
        setCases(
          rows.map((r: CasoRow) => ({
            id: r.id,
            name: r.nombre,
            branch: r.rama as BranchId,
            updated: relativo(r.creado_en),
            archived: r.archivado,
            abogadoId: r.abogado_asignado_id ?? undefined,
            asignadoA: r.abogado_asignado_id ? (memberNames.get(r.abogado_asignado_id) ?? undefined) : undefined,
          })),
        );
      })();
    } else if (demo) {
      setCases(SEED_CASES);
    }
    return () => {
      active = false;
    };
  }, [cloud, demo]);

  const loadCase = useCallback((next: BranchId, name: string, demo = false) => {
    setBranch(next);
    setCaseName(name.trim() || `Caso ${BRANCHES[next].name}`);
    setCaseIsDemo(demo);
    setLaws(cloneLaws(next));
    setActiveArticle(null);
    setEditorHtmlState("");
    setEditorVersion((v) => v + 1);
    setCaseParties([]);
    setCaseDocContent([]);
    setGeneratingDoc(false);
    if (demo) {
      // Hydrate the example with sample documents and a ready-made timeline.
      const seeded = demoFiles(next);
      const events = [...generateTimeline(next, seeded)].sort(byChrono);
      setFiles(seeded);
      setTimeline(events);
      setIngestedEvents(events);
      setMessages([welcomeMessage(next), demoNote()]);
    } else {
      setFiles([]);
      setTimeline(null);
      setIngestedEvents([]);
      setMessages([welcomeMessage(next)]);
    }
    setView("workspace");
  }, []);

  const startCase = useCallback(
    async (next: BranchId, name: string, extraction?: ExtractedCase, abogadoId?: string) => {
      const finalName = name.trim() || `Caso ${BRANCHES[next].name}`;
      let id = uid("c");
      if (cloudRef.current) {
        const row = await crearCaso({
          nombre: finalName,
          rama: next,
          asunto: extraction?.asunto,
          resumen: extraction?.summary,
          partes: extraction?.parties,
          fechas_clave: extraction?.keyDates,
          leyes_sugeridas: extraction?.suggestedLaws,
          confianza: extraction?.confidence,
          abogado_asignado_id: abogadoId,
        });
        if (row) id = row.id;
      }
      currentCaseIdRef.current = cloudRef.current ? id : null;
      setCases((prev) => [
        { id, name: finalName, branch: next, updated: "ahora" },
        ...prev.filter((c) => c.name !== finalName),
      ]);
      loadCase(next, finalName);
      setCaseModalOpen(false);
      setCaseModalPreset(null);
      return id;
    },
    [loadCase],
  );

  const openCase = useCallback(
    (id: string) => {
      const found = cases.find((c) => c.id === id);
      if (!found) return;
      setRecentCases((prev) => {
        const deduped = prev.filter((c) => c.id !== id);
        return [found, ...deduped].slice(0, 5);
      });
      // Demo or local: hydrate from the in-app examples (no cloud).
      if (found.demo || !cloudRef.current) {
        currentCaseIdRef.current = null;
        loadCase(found.branch, found.name, found.demo);
        return;
      }
      // Cloud case: open the shell, then hydrate documents, timeline and chat.
      currentCaseIdRef.current = id;
      loadCase(found.branch, found.name, false);
      void (async () => {
        const [docs, tl, msgs] = await Promise.all([
          obtenerDocumentosCaso(id),
          obtenerTimelineCaso(id),
          obtenerMensajesCaso(id),
        ]);
        if (currentCaseIdRef.current !== id) return; // user switched cases meanwhile
        if (docs.length) {
          setFiles(
            docs.map((d) => ({
              id: d.id,
              name: d.nombre,
              kind: kindFromName(d.nombre),
              size: "expediente",
              addedAt: Date.parse(d.creado_en) || Date.now(),
            })),
          );
        }
        if (tl.length) {
          const events: TimelineEvent[] = tl
            .map((e) => ({
              id: uid("ev"),
              date: e.fecha,
              iso: e.iso,
              title: e.titulo,
              detail: e.detalle ?? "",
              severity: e.severidad as TimelineSeverity,
            }))
            .sort(byChrono);
          setTimeline(events);
          setIngestedEvents(events);
        }
        if (msgs.length) {
          setMessages([
            welcomeMessage(found.branch),
            ...msgs.map((m) => ({
              id: uid("m"),
              role: m.rol,
              content: m.contenido,
              timestamp: Date.now(),
            })),
          ]);
        }
      })();
    },
    [cases, loadCase],
  );

  const goHome = useCallback(() => setView("dashboard"), []);

  const openCaseModal = useCallback((preset?: BranchId) => {
    setCaseModalPreset(preset ?? null);
    setCaseModalOpen(true);
  }, []);

  const closeCaseModal = useCallback(() => {
    setCaseModalOpen(false);
    setCaseModalPreset(null);
  }, []);

  const startIntake = useCallback((file: File) => {
    setCaseModalOpen(false);
    setIntakeFile(file);
  }, []);

  const clearIntake = useCallback(() => setIntakeFile(null), []);

  const archiveCase = useCallback((id: string) => {
    const found = cases.find((c) => c.id === id);
    if (!found) return;
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, archived: true } : c)));
    setRecentCases((prev) => prev.filter((c) => c.id !== id));
    if (cloudRef.current) void archiveCaso(id);
    if (currentCaseIdRef.current === id) setView("dashboard");
  }, [cases]);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    setRecentCases((prev) => prev.filter((c) => c.id !== id));
    if (cloudRef.current) void borrarCaso(id);
    if (currentCaseIdRef.current === id) setView("dashboard");
  }, []);

  const toggleLaw = useCallback((lawId: string) => {
    setLaws((prev) =>
      prev.map((l) => (l.id === lawId ? { ...l, enabled: !l.enabled } : l)),
    );
  }, []);

  const addFiles = useCallback((next: CaseFile[]) => {
    setFiles((prev) => [...next, ...prev]);
    const caso = currentCaseIdRef.current;
    if (caso) {
      next.forEach((f) =>
        void guardarDocumento({ caso_id: caso, nombre: f.name, tipo: KIND_TO_TIPO[f.kind] ?? "text" }),
      );
    }
  }, []);

  // Finished local transcription: add it to the archivero, feed it to the
  // assistant context, and (cloud) persist only the TEXT to the case's documentos.
  const addTranscript = useCallback((fileName: string, text: string) => {
    const id = uid("f");
    const file: CaseFile = {
      id,
      name: fileName,
      kind: "text",
      size: `${(text.length / 1024).toFixed(1)} KB`,
      addedAt: Date.now(),
    };
    setFiles((prev) => [file, ...prev]);
    setCaseDocContent((prev) => [...prev, text]);
    transcriptMapRef.current.set(id, text);
    const caso = currentCaseIdRef.current;
    if (caso) void guardarDocumento({ caso_id: caso, nombre: fileName, tipo: "transcription", contenido: text });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Drop a document into an open case: add it, then let the AI extract its data,
  // surface it in the chat, and feed the detected dates into the timeline.
  const ingestDocument = useCallback((file: File) => {
    const fileName = file.name;
    const id = uid("f");
    setFiles((prev) => [
      {
        id,
        name: fileName,
        kind: kindFromName(fileName),
        size: "analizando…",
        addedAt: Date.now(),
        analyzing: true,
      },
      ...prev,
    ]);

    const branch = branchRef.current;
    void (async () => {
      try {
        // Real analysis with Claude when configured; demo responder otherwise.
        const res =
          (await analyzeDocument(file, branch)) ??
          (await analyzeExpediente(fileName, undefined, branch));
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, analyzing: false, size: "expediente" } : f)),
        );
        const events = eventsFromExtraction(res, fileName);
        setIngestedEvents((prev) => mergeEvents(prev, events));
        setTimeline((prev) => mergeEvents(prev ?? [], events));
        setMessages((prev) => [...prev, ingestMessage(fileName, res)]);
        if (res.parties?.length) {
          setCaseParties((prev) => {
            const keys = new Set(prev.map((p) => `${p.label}|${p.value}`));
            const next = res.parties.filter((p) => !keys.has(`${p.label}|${p.value}`));
            return next.length ? [...prev, ...next] : prev;
          });
        }
        const docText = res.transcripcion || res.summary;
        if (docText) setCaseDocContent((prev) => [...prev, docText]);
        // Persist to the cloud case (best-effort) so it survives a reload.
        const caso = currentCaseIdRef.current;
        if (caso) {
          void guardarDocumento({
            caso_id: caso,
            nombre: fileName,
            tipo: KIND_TO_TIPO[kindFromName(fileName)] ?? "text",
            contenido: docText,
          });
          if (events.length)
            void guardarTimelineEventos(
              caso,
              events.map((e) => ({
                fecha: e.date,
                iso: e.iso,
                titulo: e.title,
                detalle: e.detail,
                severidad: e.severity,
              })),
            );
        }
      } catch (error) {
        console.error("Error ingesting document:", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, analyzing: false, size: "error" } : f)),
        );
      }
    })();
  }, []);

  // Seed the timeline from an already-analyzed extraction (e.g. the intake flow),
  // so the chronology is ready the moment the case is created — no re-analysis.
  const seedFromExtraction = useCallback((fileName: string, res: ExtractedCase) => {
    const events = eventsFromExtraction(res, fileName);
    if (events.length) {
      setIngestedEvents((prev) => mergeEvents(prev, events));
      setTimeline((prev) => mergeEvents(prev ?? [], events));
      const caso = currentCaseIdRef.current;
      if (caso)
        void guardarTimelineEventos(
          caso,
          events.map((e) => ({
            fecha: e.date,
            iso: e.iso,
            titulo: e.title,
            detalle: e.detail,
            severidad: e.severity,
          })),
        );
    }
    if (res.parties?.length) {
      setCaseParties((prev) => {
        const keys = new Set(prev.map((p) => `${p.label}|${p.value}`));
        const next = res.parties.filter((p) => !keys.has(`${p.label}|${p.value}`));
        return next.length ? [...prev, ...next] : prev;
      });
    }
    const docText = res.transcripcion || res.summary;
    if (docText) setCaseDocContent((prev) => [...prev, docText]);
  }, []);

  const runAssistant = useCallback(
    async (text: string, currentBranch: BranchId, enabled: Law[]) => {
      const pendingId = uid("m");
      setThinking(true);
      setMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          pending: true,
        },
      ]);
      try {
        const reply = await askAssistant(text, {
          branch: currentBranch,
          enabledLaws: enabled.filter((l) => l.enabled).map((l) => l.shortName),
          fileCount: filesRef.current.length,
          docContent: caseDocContentRef.current,
          cloud: cloudRef.current,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  content: reply.content,
                  citations: reply.citations,
                  pending: false,
                  timestamp: Date.now(),
                }
              : m,
          ),
        );
        const caso = currentCaseIdRef.current;
        if (caso) void guardarMensajeChat({ caso_id: caso, rol: "assistant", contenido: reply.content });
      } finally {
        setThinking(false);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || thinking) return;
      setMessages((prev) => [
        ...prev,
        { id: uid("m"), role: "user", content: clean, timestamp: Date.now() },
      ]);
      const caso = currentCaseIdRef.current;
      if (caso) void guardarMensajeChat({ caso_id: caso, rol: "user", contenido: clean });
      void runAssistant(clean, branch, laws);
    },
    [branch, laws, thinking, runAssistant],
  );

  // Cross-compare timeline events to flag date inconsistencies and
  // contradictory statements across documents.
  const analizarInconsistencias = useCallback((events: TimelineEvent[]): TimelineInconsistency[] => {
    const issues: TimelineInconsistency[] = [];
    if (events.length < 2) return issues;
    let ic = 0;
    // ponytail: keyword-pattern heuristic, upgrade to LLM-based contradiction detection if needed
    for (const a of events) {
      for (const b of events) {
        if (a.id >= b.id) continue;
        const aDate = a.iso ? new Date(a.iso).getTime() : NaN;
        const bDate = b.iso ? new Date(b.iso).getTime() : NaN;
        if (Number.isNaN(aDate) || Number.isNaN(bDate)) continue;
        const aLow = a.title.toLowerCase();
        const bLow = b.title.toLowerCase();
        // notification after response → inconsistent
        if (/notificaci[oó]n/.test(aLow) && /contestaci[oó]n|respuesta/.test(bLow) && aDate > bDate) {
          issues.push({
            id: `ic-${ic++}`,
            tipo: "fechas",
            descripcion: `La "${a.title}" (${a.date}) ocurre después de la "${b.title}" (${b.date}). Revisar orden cronológico.`,
            severidad: "error",
            eventos: [a.id, b.id],
          });
        }
        // demanda after sentencia → inconsistent
        if (/demanda/.test(aLow) && /sentencia|laudo|resoluci[oó]n/.test(bLow) && aDate > bDate) {
          issues.push({
            id: `ic-${ic++}`,
            tipo: "fechas",
            descripcion: `La "${a.title}" (${a.date}) ocurre después de la "${b.title}" (${b.date}). La demanda debe preceder a la resolución.`,
            severidad: "error",
            eventos: [a.id, b.id],
          });
        }
        // sources differ but dates are same with contradictory titles
        if (a.source && b.source && a.source !== b.source) {
          const sameDay = a.iso.slice(0, 10) === b.iso.slice(0, 10);
          if (sameDay && aLow !== bLow && bDate === aDate) {
            issues.push({
              id: `ic-${ic++}`,
              tipo: "declaraciones",
              descripcion: `Versiones contradictorias en "${a.source}" y "${b.source}" sobre la misma fecha (${a.date}): "${a.title}" vs "${b.title}".`,
              severidad: "warning",
              eventos: [a.id, b.id],
            });
          }
        }
      }
    }
    return issues;
  }, []);

  // Manual (re)build: show the real ingested events when there are any; otherwise
  // synthesize a branch-specific reference chronology so the feature is previewable.
  const runTimeline = useCallback(() => {
    setTimelineLoading(true);
    setTimeout(() => {
      const real = ingestedEventsRef.current;
      const base = real.length
        ? real
        : generateTimeline(branchRef.current, filesRef.current);
      const sorted = [...base].sort(byChrono);
      setTimeline(sorted);
      setInconsistencies(analizarInconsistencias(sorted));
      setTimelineLoading(false);
    }, 900);
  }, [analizarInconsistencias]);
  
  const clearTimeline = useCallback(() => {
    setTimeline(null);
    setInconsistencies([]);
  }, []);

  const getTranscriptContent = useCallback((fileId: string): string | undefined => {
    return transcriptMapRef.current.get(fileId);
  }, []);

  // ponytail: simulated analysis; replace with real Claude/OpenAI extraction when available
  const analyzeContract = useCallback((_file: File) => {
    setAnalysisLoading(true);
    setActiveAnalysis(null);
    setTimeout(() => {
      setActiveAnalysis({
        riskScore: 75,
        pros: [
          "Cláusula de arbitraje bien definida con sede en Ciudad de México",
          "Plazos de pago alineados a la práctica comercial estándar (30 días)",
          "Confidencialidad recíproca con 3 años de vigencia posterior",
        ],
        cons: [
          "Letras chiquitas: penalización del 15% sobre el monto total por rescisión anticipada",
          "No hay límite de responsabilidad para daños indirectos en caso de incumplimiento",
          "Jurisdicción exclusiva en el domicilio del acreedor, desventaja geográfica",
        ],
        strategy: "Recomendamos renegociar la penalización por rescisión (máximo 5%) y agregar un tope de responsabilidad equivalente al 100% del valor del contrato. La cláusula de jurisdicción debería modificarse a neutral (arbitraje institucional CMA).",
        criticalClauses: [
          {
            title: "Penalización por rescisión",
            currentText: "En caso de rescisión anticipada, la parte incumplida pagará el 15% del monto total del contrato como penalización.",
            alternativeText: "En caso de rescisión anticipada, la parte incumplida pagará el 5% del monto total del contrato como penalización, con un tope máximo equivalente a 3 mensualidades del servicio contratado.",
          },
          {
            title: "Límite de responsabilidad",
            currentText: "La parte incumplida será responsable de todos los daños y perjuicios derivados, incluyendo daños indirectos, sin límite alguno.",
            alternativeText: "La responsabilidad total de cualquiera de las partes se limitará al 100% del valor total del contrato, quedando expresamente excluidos los daños indirectos o pérdida de oportunidades de negocio.",
          },
        ],
      });
      setAnalysisLoading(false);
    }, 2000);
  }, []);

  // ponytail: simulated per-template document generation; replace with LLM prompt + backend endpoint
  const generateCustomDocument = useCallback(
    (templateId: string, variables: Record<string, string>, notes: string) => {
      setDocGenLoading(true);
      setDocumentPreview("");
      setTimeout(() => {
        const today = new Date().toLocaleDateString("es-MX");
        const city = "Ciudad de México";

        const fmt = (k: string) => variables[k] || `[${k}]`;

        let body = "";

        switch (templateId) {
          case "arrendamiento":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">CONTRATO DE ARRENDAMIENTO RESIDENCIAL</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, comparecen <strong>${fmt("arrendador")}</strong> como ARRENDADOR y <strong>${fmt("arrendatario")}</strong> como ARRENDATARIO, quienes celebran el presente Contrato de Arrendamiento respecto del inmueble ubicado en <strong>${fmt("domicilio")}</strong>.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  EL ARRENDATARIO se obliga a pagar a EL ARRENDADOR la cantidad de <strong>$${fmt("renta")} MXN</strong> como renta mensual, pagadera dentro de los primeros cinco días de cada mes, en el domicilio del inmueble o en la cuenta bancaria que designe EL ARRENDADOR.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  El presente arrendamiento tendrá una vigencia del <strong>${fmt("fechaInicio")}</strong> al <strong>${fmt("fechaFin")}</strong>, período durante el cual EL ARRENDATARIO se compromete a usar el inmueble única y exclusivamente como habitación, a conservarlo en buen estado y a no realizar modificaciones sin autorización previa por escrito.
</p>`;
            break;
          case "servicios":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, comparecen <strong>${fmt("prestador")}</strong> en lo sucesivo "EL PRESTADOR", y <strong>${fmt("cliente")}</strong> en lo sucesivo "EL CLIENTE", para celebrar el presente Contrato de Prestación de Servicios Profesionales.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>OBJETO:</strong> EL PRESTADOR se obliga a realizar a favor de EL CLIENTE los siguientes servicios: <strong>${fmt("descripcion")}</strong>, mismos que serán ejecutados con la debida diligencia, ética profesional y conforme a los más altos estándares de la materia.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  Como contraprestación, EL CLIENTE pagará a EL PRESTADOR la cantidad de <strong>$${fmt("honorarios")} MXN</strong>. El plazo de ejecución del servicio iniciará el <strong>${fmt("fechaInicio")}</strong>.
</p>`;
            break;
          case "nda":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">ACUERDO DE CONFIDENCIALIDAD (NDA)</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, celebran el presente Acuerdo de Confidencialidad <strong>${fmt("parteReveladora")}</strong> como PARTE REVELADORA y <strong>${fmt("parteReceptora")}</strong> como PARTE RECEPTORA, con el fin de proteger la información sensible que intercambien en el marco de su relación comercial y profesional.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>MATERIA:</strong> La información confidencial objeto del presente acuerdo comprende <strong>${fmt("materia")}</strong>, así como cualquier dato, documentación o información técnica, financiera, comercial o legal que las partes intercambien.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  La obligación de confidencialidad tendrá una vigencia hasta el <strong>${fmt("vigencia")}</strong>, y se extiende incluso después de terminada la relación entre las partes.
</p>`;
            break;
          case "pagare":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">PAGARÉ EJECUTIVO</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, <strong>${fmt("deudor")}</strong> en su carácter de DEUDOR, reconoce haber recibido de <strong>${fmt("acreedor")}</strong> en su carácter de ACREEDOR, la cantidad de <strong>$${fmt("cantidad")} MXN</strong>, misma que se obliga a devolver en los términos aquí establecidos.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  La parte deudora se obliga a pagar la cantidad antes señalada a más tardar el día <strong>${fmt("vigencia")}</strong>, más los intereses moratorios a una tasa de <strong>${fmt("intereses")}</strong> que se causarán en caso de incumplimiento.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  El presente título ejecutivo mercantil se suscribe conforme a lo dispuesto por la Ley General de Títulos y Operaciones de Crédito, y el deudor se constituye en mora sin necesidad de requerimiento judicial o extrajudicial.
</p>`;
            break;
          case "compraventa":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">CONTRATO DE COMPRAVENTA DE BIENES</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, comparecen <strong>${fmt("vendedor")}</strong> como VENDEDOR y <strong>${fmt("comprador")}</strong> como COMPRADOR, quienes celebran el presente Contrato de Compraventa.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>OBJETO:</strong> EL VENDEDOR transfiere la propiedad del bien descrito como <strong>${fmt("bien")}</strong>, libre de gravámenes, vicios ocultos y adeudos, a favor de EL COMPRADOR, quien lo recibe a su entera satisfacción.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  El precio de venta convenido es de <strong>$${fmt("precio")} MXN</strong>, mismo que EL COMPRADOR paga en este acto a EL VENDEDOR, quien recibe la cantidad a su entera conformidad. La fecha de cierre y entrega formal del bien será el <strong>${fmt("fechaCierre")}</strong>.
</p>`;
            break;
          case "divorcio":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">CONVENIO DE DIVORCIO VOLUNTARIO</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  En ${city}, a ${today}, comparecen <strong>${fmt("conyuge1")}</strong> y <strong>${fmt("conyuge2")}</strong>, en lo sucesivo "LOS CÓNYUGES", quienes manifiestan su voluntad de disolver el vínculo matrimonial que los une de manera voluntaria y sin mediar causa de responsabilidad.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>RÉGIMEN MATRIMONIAL:</strong> LOS CÓNYUGES declaran que su matrimonio se rigió bajo el régimen de <strong>${fmt("regimen")}</strong>, por lo que procederán a la liquidación conforme a derecho.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  El domicilio conyugal ubicado en <strong>${fmt("domicilioConyugal")}</strong> será ocupado conforme al acuerdo entre las partes. En concepto de pensión alimenticia, se establece la cantidad de <strong>$${fmt("pension")} MXN</strong>.
</p>`;
            break;
          case "contestacion":
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">CONTESTACIÓN DE DEMANDA</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>${fmt("demandado")}</strong>, por su propio derecho, con domicilio procesal para oír y recibir notificaciones, comparezco ante este H. Tribunal a dar contestación a la demanda instaurada en mi contra, dentro de los términos concedidos por el artículo correspondiente.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  <strong>JUZGADO:</strong> ${fmt("juzgado")}. <strong>MATERIA:</strong> ${fmt("materia")}. <strong>CUANTÍA:</strong> $${fmt("cuantia")} MXN.
</p>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  Me opongo a la totalidad de las prestaciones reclamadas y formulo las siguientes excepciones y defensas: (1) Falta de acción y de derecho de la parte actora; (2) Improcedencia de la vía; (3) Obscuridad en el planteamiento de las prestaciones. Asimismo, ofrezco las pruebas pertinentes para acreditar mi defensa.
</p>`;
            break;
          default:
            body = `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:20px">DOCUMENTO LEGAL</h2>
<p style="font-family:Georgia,serif;font-size:11pt;line-height:1.7;margin-bottom:12px;text-align:justify">
  Documento genérico generado.
</p>`;
        }

        const notesHtml = notes
          ? `<p style="font-family:Georgia,serif;font-size:10pt;line-height:1.6;margin-bottom:12px;color:#475569;border-left:3px solid #1E3A5F;padding-left:12px"><em>Notas del abogado: ${notes}</em></p>`
          : "";

        setDocumentPreview(
          `${body}
${notesHtml}
<hr style="border:none;border-top:1px solid #cbd5e1;margin:24px 0" />
<p style="font-family:Arial,sans-serif;font-size:9pt;color:#64748b;text-align:center">
  Documento generado por PasantIA · Notaría Express · ${new Date().toLocaleDateString("es-MX")}
</p>`,
        );
        setDocGenLoading(false);
      }, 1500);
    },
    [],
  );

  const openArticle = useCallback((c: Citation) => setActiveArticle(c), []);
  const closeArticle = useCallback(() => setActiveArticle(null), []);

  const setEditorHtml = useCallback((html: string) => setEditorHtmlState(html), []);

  const casePartiesRef = useRef(caseParties);
  casePartiesRef.current = caseParties;
  const caseNameRef = useRef(caseName);
  caseNameRef.current = caseName;

  const insertDocument = useCallback(
    (kind: DocKind) => {
      const currentBranch = branchRef.current;
      const currentName = caseNameRef.current;

      // Si está vacío pero es un caso demo, inyectamos contexto real de prueba para Claude
      const currentParties = casePartiesRef.current.length > 0
        ? casePartiesRef.current
        : [{ label: "Actor/Ofendido", value: "Antonio Santos Bustamante" }, { label: "Demandado/Imputado", value: "Faustino Marcial Chigo" }];

      const currentDocs = caseDocContentRef.current.length > 0
        ? caseDocContentRef.current
        : ["El imputado Faustino Marcial Chigo agredió físicamente con un objeto punzocortante causando heridas graves en la extremidad superior izquierda al ofendido Antonio Santos Bustamante, dándose a la fuga en San Andrés Tuxtla, Veracruz."];

      setGeneratingDoc(true);
      void (async () => {
        try {
          const aiHtml = await generateDocumentAI({
            kind,
            branch: currentBranch,
            caseName: currentName,
            parties: currentParties,
            facts: currentDocs,
          });
          const html = aiHtml ?? generateDocument(kind, currentBranch, currentName);
          setEditorHtmlState((prev) => (prev ? `${prev}<hr/>${html}` : html));
          setEditorVersion((v) => v + 1);
        } finally {
          setGeneratingDoc(false);
        }
      })();
    },
    [],
  );

  const updateSettings = useCallback(
    (patch: Partial<SystemSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );

  // Secure session: wipe client + vectors on tab close.
  useEffect(() => {
    if (!settings.secureSession) return;
    const wipe = () => {
      try {
        sessionStorage.clear();
        localStorage.removeItem("nl-workspace");
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", wipe);
    return () => window.removeEventListener("beforeunload", wipe);
  }, [settings.secureSession]);

  const docKindsForBranch = useMemo(() => getDocKindsForBranch(branch), [branch]);
  const isDespacho = settings.accountMode === "despacho";
  const activeCases = useMemo(() => cases.filter((c) => !c.archived), [cases]);
  const archivedCases = useMemo(() => cases.filter((c) => c.archived), [cases]);

  const value = useMemo<WorkspaceCtx>(
    () => ({
      view,
      setView,
      cases,
      recentCases,
      caseAction,
      setCaseAction,
      caseModalOpen,
      caseModalPreset,
      intakeFile,
      branch,
      caseName,
      caseIsDemo,
      laws,
      files,
      messages,
      thinking,
      timeline,
      timelineLoading,
      editorHtml,
      editorVersion,
      activeArticle,
      settings,
      generatingDoc,
      caseParties,
      caseDocContent,
      goHome,
      openCase,
      openCaseModal,
      closeCaseModal,
      startIntake,
      clearIntake,
      startCase,
      toggleLaw,
      addFiles,
      addTranscript,
      ingestDocument,
      seedFromExtraction,
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      getTranscriptContent,
      inconsistencies,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
      docKindsForBranch,
      updateSettings,
      archiveCase,
      deleteCase,
      activeCases,
      archivedCases,
      members,
      isDespacho,
      activeAnalysis,
      analysisLoading,
      selectedTemplate,
      documentPreview,
      docGenLoading,
      analyzeContract,
      generateCustomDocument,
      setSelectedTemplate,
      systemUsage,
    }),
    [
      view,
      setView,
      cases,
      recentCases,
      members,
      isDespacho,
      caseAction,
      setCaseAction,
      caseModalOpen,
      caseModalPreset,
      intakeFile,
      branch,
      caseName,
      caseIsDemo,
      laws,
      files,
      messages,
      thinking,
      timeline,
      timelineLoading,
      editorHtml,
      editorVersion,
      activeArticle,
      settings,
      generatingDoc,
      caseParties,
      caseDocContent,
      activeAnalysis,
      analysisLoading,
      selectedTemplate,
      documentPreview,
      docGenLoading,
      goHome,
      openCase,
      openCaseModal,
      closeCaseModal,
      startIntake,
      clearIntake,
      startCase,
      toggleLaw,
      addFiles,
      addTranscript,
      ingestDocument,
      seedFromExtraction,
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      getTranscriptContent,
      inconsistencies,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
      docKindsForBranch,
      updateSettings,
      archiveCase,
      deleteCase,
      activeCases,
      archivedCases,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
