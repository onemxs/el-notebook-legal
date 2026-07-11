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
import { analyzeDocument, generateDocumentAI, revisarContratoAI } from "./claude";
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
  addPlazo: (titulo: string, iso: string, detalle: string) => void;
  getTranscriptContent: (fileName: string) => string | undefined;
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
  caseQuery: string;
  setCaseQuery: (q: string) => void;
  analyzeContract: (file: File) => void;
  generateCustomDocument: (templateId: string, variables: Record<string, string>, notes: string) => void;
  setSelectedTemplate: (id: string | null) => void;
  systemUsage: { iaCreditsUsed: number; iaCreditsLimit: number; localAudioMinutesUsed: number; localAudioMinutesLimit: number };
  referralData: { inviteCode: string; totalInvited: number; activeSubscriptions: number; stripeRewardApplied: boolean };
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
  const [caseQuery, setCaseQuery] = useState("");
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
  const [referralData] = useState({
    inviteCode: "PAS-ONESIMO-78",
    totalInvited: 3,
    activeSubscriptions: 1,
    stripeRewardApplied: true,
  });

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

  // Añade un término procesal calculado a la cronología del caso (y a Supabase
  // en la nube) como evento de tipo "deadline", para que alimente los avisos.
  const addPlazo = useCallback((titulo: string, iso: string, detalle: string) => {
    const fecha = new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const ev: TimelineEvent = {
      id: uid("plazo"),
      date: fecha,
      iso,
      title: titulo,
      detail: detalle,
      severity: "deadline",
      source: "Cálculo de término procesal",
    };
    setTimeline((prev) => [...(prev ?? []), ev].sort(byChrono));
    const caso = currentCaseIdRef.current;
    if (caso)
      void guardarTimelineEventos(caso, [
        { fecha: ev.date, iso: ev.iso, titulo: ev.title, detalle: ev.detail, severidad: "deadline" },
      ]);
  }, []);

  const getTranscriptContent = useCallback((fileId: string): string | undefined => {
    return transcriptMapRef.current.get(fileId);
  }, []);

  // Auditoría real vía /api/revisar-contrato; sin sesión/IA cae al ejemplo demo.
  const analyzeContract = useCallback((file: File) => {
    setAnalysisLoading(true);
    setActiveAnalysis(null);
    void (async () => {
      const real = await revisarContratoAI(file);
      if (real) {
        setActiveAnalysis(real);
        setAnalysisLoading(false);
        return;
      }
      demoContractAnalysis();
    })();
  }, []);

  // ponytail: análisis ilustrativo para modo demo (sin sesión no hay endpoints de IA)
  const demoContractAnalysis = () => {
    setTimeout(() => {
      setActiveAnalysis({
        source: "demo",
        tipoContrato: "Contrato de prestación de servicios (ejemplo)",
        parties: [
          { label: "Prestador", value: "Servicios Corporativos Delta, S.A. de C.V." },
          { label: "Cliente", value: "Comercializadora del Bajío, S. de R.L." },
        ],
        vigencia: { inicio: "1 de enero de 2026", fin: "31 de diciembre de 2026", renovacion: "Renovación automática anual salvo aviso con 30 días" },
        faltantes: ["Tope de responsabilidad", "Cláusula de caso fortuito y fuerza mayor", "Protección de datos personales (LFPDPPP)"],
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
            risk: "alto",
            currentText: "En caso de rescisión anticipada, la parte incumplida pagará el 15% del monto total del contrato como penalización.",
            alternativeText: "En caso de rescisión anticipada, la parte incumplida pagará el 5% del monto total del contrato como penalización, con un tope máximo equivalente a 3 mensualidades del servicio contratado.",
          },
          {
            title: "Límite de responsabilidad",
            risk: "medio",
            currentText: "La parte incumplida será responsable de todos los daños y perjuicios derivados, incluyendo daños indirectos, sin límite alguno.",
            alternativeText: "La responsabilidad total de cualquiera de las partes se limitará al 100% del valor total del contrato, quedando expresamente excluidos los daños indirectos o pérdida de oportunidades de negocio.",
          },
        ],
      });
      setAnalysisLoading(false);
    }, 800);
  };

  // ponytail: simulated per-template document generation; replace with LLM prompt + backend endpoint
  const generateCustomDocument = useCallback(
    (templateId: string, variables: Record<string, string>, notes: string) => {
      setDocGenLoading(true);
      setDocumentPreview("");
      setTimeout(() => {
        const today = new Date().toLocaleDateString("es-MX");
        const city = "Ciudad de México";

        const fmt = (k: string) => variables[k] || `[${k}]`;

        // ponytail: shared helpers for long-form documents
        const H = (t: string) => `<h2 style="font-family:Arial,sans-serif;color:#1E3A5F;font-size:11pt;margin-top:24px;margin-bottom:8px">${t}</h2>`;
        const P = (html: string, indent = "") => `<p style="font-family:Georgia,serif;font-size:10pt;line-height:1.7;margin-bottom:8px;text-align:justify${indent ? ";padding-left:" + indent : ""}">${html}</p>`;
        const CL = (n: string, t: string, b: string) => `<p style="font-family:Georgia,serif;font-size:10pt;line-height:1.7;margin-bottom:8px;text-align:justify"><strong>${n}. — ${t}.</strong> ${b}</p>`;
        const SIG = (r: string, n: string) => `<div style="text-align:center;width:30%"><div style="border-top:1px solid #1E3A5F;margin-bottom:4px;padding-top:4px"><p style="font-family:Georgia,serif;font-size:9pt;margin:0"><strong>${n}</strong></p><p style="font-family:Arial,sans-serif;font-size:8pt;color:#475569;margin:2px 0">${r.toUpperCase()}</p></div></div>`;
        const CLS = (n: string, t: string, b: string) => `\n${CL(n, t, b)}`;
        const SIGS = (...rows: { r: string; n: string }[]) => `\n${H("F I R M A S")}\n<div style="display:flex;justify-content:space-between;margin-top:40px">${rows.map((s) => SIG(s.r, s.n)).join("")}</div>`;
        const TITLE = (t: string) => `<h1 style="font-family:Arial,sans-serif;color:#1E3A5F;text-align:center;margin-bottom:4px">${t}</h1>\n<p style="font-family:Arial,sans-serif;font-size:9pt;text-align:center;color:#475569;margin-bottom:20px">Versión Blindada — ${today}</p>`;

        let body = "";

        switch (templateId) {
          case "arrendamiento":
            const arrendador = fmt("arrendador");
            const arrendatario = fmt("arrendatario");
            const inmueble = fmt("domicilio");
            const renta = fmt("renta");
            const fiadorIncluido = variables.fiador === "Sí";
            const extincion = variables.extincion_dominio === "Sí";
            const mora = variables.moratorio || "2";
            const juris = variables.jurisdiccion || "Tribunales de la Ciudad de México";
            const vigencia = variables.vigencia || "12";
body = `${TITLE("CONTRATO DE ARRENDAMIENTO")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, comparecen por una parte <strong>${arrendador}</strong>, a quien en lo sucesivo se le denominará "EL ARRENDADOR", y por otra parte <strong>${arrendatario}</strong>, a quien en lo sucesivo se le denominará "EL ARRENDATARIO", quienes manifiestan su voluntad de celebrar el presente Contrato de Arrendamiento, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> EL ARRENDADOR declara bajo protesta de decir verdad:")}
${P(`a) Ser legítimo propietario del inmueble ubicado en <strong>${inmueble}</strong>, mismo que se encuentra libre de gravámenes, hipotecas, embargos, litigios o cualquier limitación de dominio que pudiera afectar el presente arrendamiento.<br/>b) Tener capacidad jurídica y poder de disposición plena para celebrar este contrato.<br/>c) Que el inmueble cuenta con las condiciones de habitabilidad, seguridad sanitaria y servicios necesarios para su uso como vivienda habitual.`, "20px")}
${P("<strong>II.</strong> EL ARRENDATARIO declara bajo protesta de decir verdad:")}
${P(`a) Conocer el inmueble objeto del presente arrendamiento y reconocer que se encuentra en condiciones óptimas para el uso convenido.<br/>b) Contar con solvencia económica suficiente para cumplir con las obligaciones derivadas de este contrato.<br/>c) Que destinará el inmueble exclusivamente como casa habitación, quedando estrictamente prohibido cualquier uso comercial, industrial o distinto al pactado.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente contrato se rige por lo dispuesto en el Código Civil Federal y las disposiciones aplicables del Estado correspondiente.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "OBJETO", `EL ARRENDADOR da en arrendamiento a EL ARRENDATARIO el inmueble descrito, mismo que EL ARRENDATARIO recibe a su entera satisfacción y se obliga a usar única y exclusivamente como casa habitación, quedando terminantemente prohibido destinarlo a otro fin.`)}
${CL("SEGUNDA", "PRECIO Y FORMA DE PAGO", `EL ARRENDATARIO se obliga a pagar a EL ARRENDADOR la cantidad de <strong>$${renta} MXN</strong> mensuales, que cubrirá precisamente dentro de los primeros cinco días naturales de cada mes, en efectivo contra recibo o mediante transferencia bancaria a la cuenta que designe EL ARRENDADOR. El pago deberá realizarse en moneda nacional, quedando prohibido el pago en especie o mediante compensación.`)}
${CL("TERCERA", "VIGENCIA", `El presente arrendamiento tendrá una vigencia de <strong>${vigencia} meses</strong>, contados a partir de la fecha de firma del presente instrumento. Al término del plazo pactado, si ninguna de las partes manifiesta por escrito su voluntad de no renovar con al menos treinta días naturales de antelación, el contrato se prorrogará por plazo indefinido, quedando a salvo el derecho de cualquiera de las partes para darlo por terminado mediante aviso por escrito con treinta días de anticipación.`)}
${CL("CUARTA", "INTERESES MORATORIOS", `En caso de retraso en el pago de la renta, EL ARRENDATARIO cubrirá a EL ARRENDADOR un interés moratorio del <strong>${mora}% mensual</strong> sobre el monto total adeudado, sin que ello implique novación o espera alguna.`)}
${CL("QUINTA", "PENALIDAD POR RETRASO", `Si EL ARRENDATARIO incurre en mora en el pago de dos o más rentas, consecutivas o alternadas, EL ARRENDADOR tendrá derecho a dar por rescindido el contrato de pleno derecho, exigiendo el pago de todas las rentas vencidas y las que faltaren por vencer, así como una penalidad equivalente al veinte por ciento del monto total de las rentas pendientes.`)}
${CL("SEXTA", "PROHIBICIÓN DE SUBARRENDAMIENTO", `Queda estrictamente prohibido a EL ARRENDATARIO subarrendar, ceder los derechos del presente contrato, dar en comodato, o permitir el uso del inmueble a terceros bajo cualquier título, sea oneroso o gratuito, incluyendo plataformas digitales de hospedaje temporal como Airbnb, Booking.com o similares. El incumplimiento de esta cláusula dará lugar a la rescisión automática del contrato.`)}
${CL("SÉPTIMA", "DEPÓSITO EN GARANTÍA", `EL ARRENDATARIO entrega en este acto a EL ARRENDADOR la cantidad equivalente a un mes de renta como depósito en garantía, mismo que no generará intereses y será devuelto al término del arrendamiento, una vez desocupado el inmueble y comprobado que no existen adeudos ni daños imputables a EL ARRENDATARIO.`)}
${CL("OCTAVA", "MANTENIMIENTO E INSPECCIÓN", `EL ARRENDATARIO se obliga a conservar el inmueble en el mismo estado en que lo recibió, realizando por su cuenta las reparaciones menores que demande el uso ordinario. EL ARRENDADOR tendrá derecho a inspeccionar el inmueble previo aviso de al menos 48 horas, en días hábiles y en horario razonable, para verificar su estado de conservación.`)}
${CL("NOVENA", "MODIFICACIONES", `EL ARRENDATARIO no podrá realizar modificaciones, alteraciones, construcciones o mejoras al inmueble sin autorización previa y por escrito de EL ARRENDADOR. Cualquier mejora realizada quedará en beneficio del inmueble sin derecho a reembolso.`)}
${CL("DÉCIMA", "CAUSAS DE RESCISIÓN", `Son causas de rescisión del presente contrato, además de las previstas en la ley: a) La falta de pago puntual de una sola renta; b) El destino del inmueble a un uso distinto al pactado; c) El subarrendamiento o cesión de derechos; d) Los actos de molestia a los vecinos o infracciones al reglamento de la propiedad; e) El deterioro intencional o por negligencia del inmueble.`)}
${fiadorIncluido ? CLS("DÉCIMA PRIMERA", "FIADOR / OBLIGADO SOLIDARIO", `En este acto se constituye como fiador y obligado solidario el C. [Nombre del Fiador], quien renuncia expresamente a los beneficios de orden, excusión y división, así como a cualquier otro que le favorezca, obligándose al pago de todas las cantidades que EL ARRENDATARIO adeude por cualquier concepto derivado del presente contrato, incluyendo rentas, intereses moratorios, penalidades y gastos de cobranza.`) : ""}
${extincion ? CLS("DÉCIMA SEGUNDA", "EXTINCIÓN DE DOMINIO", `EL ARRENDATARIO y, en su caso, EL FIADOR, declaran bajo protesta de decir verdad que los recursos económicos con los que cubrirán las obligaciones derivadas del presente contrato provienen de actividades lícitas y debidamente declaradas ante las autoridades fiscales competentes. En caso de que se inicie un procedimiento de extinción de dominio sobre el inmueble o sobre los recursos de cualquiera de las partes, el presente contrato quedará rescindido de pleno derecho sin responsabilidad para EL ARRENDADOR.`) : ""}
${P(`<strong>${fiadorIncluido && extincion ? "DÉCIMA TERCERA" : fiadorIncluido || extincion ? "DÉCIMA SEGUNDA" : "DÉCIMA PRIMERA"}. — JURISDICCIÓN.</strong> Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la competencia de los <strong>${juris}</strong>, renunciando a cualquier otro fuero que pudiera corresponderles en razón de su domicilio presente o futuro.`)}
${P(`<strong>${fiadorIncluido && extincion ? "DÉCIMA CUARTA" : fiadorIncluido || extincion ? "DÉCIMA TERCERA" : "DÉCIMA SEGUNDA"}. — LEGISLACIÓN APLICABLE.</strong> El presente contrato se rige por las disposiciones del Código Civil Federal, el Código de Comercio y las leyes supletorias aplicables en el territorio mexicano.`)}
${P(`<strong>${fiadorIncluido && extincion ? "DÉCIMA QUINTA" : fiadorIncluido || extincion ? "DÉCIMA CUARTA" : "DÉCIMA TERCERA"}. — FIRMAS.</strong> Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: arrendador, n: "ARRENDADOR" }, { r: arrendatario, n: "ARRENDATARIO" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}${SIG(fiadorIncluido ? "FIADOR" : "", "")}
</div>`;
            break;
          case "servicios":
            const prestador = fmt("prestador");
            const cliente = fmt("cliente");
            const descripcion = fmt("descripcion");
            const honorarios = fmt("honorarios");
            const fechaInicio = fmt("fechaInicio");
body = `${TITLE("CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, comparecen por una parte <strong>${prestador}</strong>, a quien en lo sucesivo se le denominará "EL PRESTADOR", y por otra parte <strong>${cliente}</strong>, a quien en lo sucesivo se le denominará "EL CLIENTE", quienes celebran el presente Contrato de Prestación de Servicios Profesionales, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> EL PRESTADOR declara bajo protesta de decir verdad:")}
${P(`a) Tener capacidad jurídica, experiencia y conocimientos técnicos suficientes para prestar los servicios objeto del presente contrato.<br/>b) Encontrarse al corriente en sus obligaciones fiscales y contar con la cédula profesional y registros que exige la ley para el ejercicio de su profesión.<br/>c) Que los servicios serán prestados de manera personal, salvo autorización expresa en contrario de EL CLIENTE.`, "20px")}
${P("<strong>II.</strong> EL CLIENTE declara bajo protesta de decir verdad:")}
${P(`a) Tener capacidad jurídica para contratar y obligarse en los términos del presente instrumento.<br/>b) Haber recibido información suficiente sobre el alcance y limitaciones de los servicios contratados.<br/>c) Que proporcionará a EL PRESTADOR toda la documentación e información necesaria para la ejecución del servicio de manera oportuna y veraz.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente contrato se rige por lo dispuesto en el Código Civil Federal y, en su caso, por el Código de Comercio, así como por las disposiciones aplicables en la materia.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "OBJETO", `EL PRESTADOR se obliga a prestar a EL CLIENTE los servicios profesionales consistentes en <strong>${descripcion}</strong>, mismos que serán ejecutados con la debida diligencia, ética profesional y conforme a los más altos estándares de la materia.`)}
${CL("SEGUNDA", "HONORARIOS", `EL CLIENTE pagará a EL PRESTADOR la cantidad de <strong>$${honorarios} MXN</strong> como contraprestación por los servicios objeto del presente contrato. Dicha cantidad será pagadera en [especificar forma de pago: contado / parcialidades], dentro de los [___] días siguientes a la presentación de la factura correspondiente.`)}
${CL("TERCERA", "VIGENCIA Y PLAZO", `El presente contrato surtirá efectos a partir del <strong>${fechaInicio}</strong> y tendrá una vigencia de [___] meses, prorrogables por acuerdo escrito de las partes. Cualquiera de las partes podrá dar por terminado el contrato mediante aviso por escrito con [___] días de anticipación.`)}
${CL("CUARTA", "FORMA DE PAGO", `El pago se realizará mediante transferencia bancaria o depósito en la cuenta que designe EL PRESTADOR. EL CLIENTE se obliga a realizar los pagos en las fechas convenidas, quedando constituido en mora sin necesidad de requerimiento judicial o extrajudicial.`)}
${CL("QUINTA", "CONFIDENCIALIDAD", `EL PRESTADOR se obliga a guardar estricta confidencialidad sobre toda la información, documentos y datos de EL CLIENTE a los que tenga acceso con motivo de la prestación del servicio, obligación que subsistirá incluso después de terminado el presente contrato por un plazo de [___] años.`)}
${CL("SEXTA", "PROPIEDAD INTELECTUAL", `Todos los entregables, documentos, informes y materiales desarrollados por EL PRESTADOR en el marco del presente contrato serán propiedad exclusiva de EL CLIENTE, una vez que hayan sido cubiertos la totalidad de los honorarios pactados.`)}
${CL("SÉPTIMA", "RESPONSABILIDAD", `EL PRESTADOR responderá por la calidad técnica de los servicios prestados, limitando su responsabilidad al monto total de los honorarios recibidos, quedando expresamente excluidos los daños indirectos, pérdida de oportunidades o lucro cesante.`)}
${CL("OCTAVA", "CAUSAS DE RESCISIÓN", `Son causas de rescisión del presente contrato: a) El incumplimiento de cualquiera de las obligaciones esenciales; b) La falta de pago oportuno de los honorarios; c) La violación de la confidencialidad; d) El dolo, mala fe o negligencia grave de cualquiera de las partes en el cumplimiento de sus obligaciones.`)}
${CL("NOVENA", "JURISDICCIÓN", `Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la competencia de los Tribunales de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles en razón de su domicilio presente o futuro.`)}
${CL("DÉCIMA", "LEGISLACIÓN APLICABLE", `El presente contrato se rige por las disposiciones del Código Civil Federal y, en lo conducente, por el Código de Comercio, así como por las leyes supletorias aplicables en el territorio mexicano.`)}
${P(`<strong>DÉCIMA PRIMERA. — FIRMAS.</strong> Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: prestador, n: "EL PRESTADOR" }, { r: cliente, n: "EL CLIENTE" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}
</div>`;
            break;
          case "nda":
            const reveladora = fmt("parteReveladora");
            const receptora = fmt("parteReceptora");
            const materia = fmt("materia");
            const vigenciaNda = fmt("vigencia");
body = `${TITLE("ACUERDO DE CONFIDENCIALIDAD (NDA)")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, comparecen <strong>${reveladora}</strong>, a quien en lo sucesivo se le denominará "PARTE REVELADORA", y <strong>${receptora}</strong>, a quien en lo sucesivo se le denominará "PARTE RECEPTORA", quienes celebran el presente Acuerdo de Confidencialidad, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> La PARTE REVELADORA declara bajo protesta de decir verdad:")}
${P(`a) Ser titular legítima de la información confidencial que será divulgada en el marco de la relación comercial entre las partes.<br/>b) Que la información que se divulgue tiene el carácter de confidencial y constituye un activo estratégico de su negocio.<br/>c) Que el presente acuerdo es necesario para proteger dicha información frente a su divulgación no autorizada.`, "20px")}
${P("<strong>II.</strong> La PARTE RECEPTORA declara bajo protesta de decir verdad:")}
${P(`a) Que la información confidencial que reciba será utilizada única y exclusivamente para los fines previstos en la relación comercial.<br/>b) Que implementará las medidas de seguridad necesarias para proteger la confidencialidad de la información.<br/>c) Que permitirá el acceso a la información únicamente a aquellas personas que necesiten conocerla para los fines autorizados.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente acuerdo se rige por lo dispuesto en la Ley Federal de Protección a la Propiedad Industrial, el Código Civil Federal y las disposiciones aplicables en la materia.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL", `Se considera información confidencial toda aquella información, datos, documentos, know-how, secretos comerciales, estrategias de negocio, listas de clientes, información técnica, financiera, jurídica o comercial que las partes intercambien, específicamente la relacionada con <strong>${materia}</strong>.`)}
${CL("SEGUNDA", "OBLIGACIONES DE LA PARTE RECEPTORA", `La PARTE RECEPTORA se obliga a: a) No divulgar, reproducir, distribuir o utilizar la información confidencial para fines distintos a los autorizados; b) Implementar medidas de seguridad físicas y tecnológicas para evitar el acceso no autorizado; c) Notificar inmediatamente a la PARTE REVELADORA cualquier violación de seguridad o uso no autorizado.`)}
${CL("TERCERA", "ALCANCE Y VIGENCIA", `La obligación de confidencialidad tendrá una vigencia hasta el <strong>${vigenciaNda}</strong>, y se extiende incluso después de terminada la relación entre las partes por un plazo adicional de [___] años, salvo que la información pierda su carácter confidencial por causas ajenas a la PARTE RECEPTORA.`)}
${CL("CUARTA", "EXCEPCIONES", `No se considerará información confidencial: a) La que sea o llegue a ser de dominio público sin culpa de la PARTE RECEPTORA; b) La que la PARTE RECEPTORA haya desarrollado independientemente sin usar información de la PARTE REVELADORA; c) La que sea requerida por autoridad judicial o administrativa competente.`)}
${CL("QUINTA", "PENALIDAD POR INCUMPLIMIENTO", `En caso de incumplimiento de las obligaciones de confidencialidad, la PARTE RECEPTORA pagará a la PARTE REVELADORA una penalidad equivalente a [___] UMA, sin perjuicio de las acciones legales que correspondan por daños y perjuicios, incluyendo el lucro cesante y el daño moral.`)}
${CL("SEXTA", "DEVOLUCIÓN DE INFORMACIÓN", `Al término del presente acuerdo o a solicitud de la PARTE REVELADORA, la PARTE RECEPTORA deberá devolver o destruir toda la información confidencial recibida, incluyendo copias, extractos y reproducciones, certificando por escrito dicha destrucción.`)}
${CL("SÉPTIMA", "PROPIEDAD", `Ninguna disposición del presente acuerdo confiere a la PARTE RECEPTORA derecho de propiedad, licencia o explotación sobre la información confidencial, cuyo titular exclusivo es y seguirá siendo la PARTE REVELADORA.`)}
${CL("OCTAVA", "JURISDICCIÓN", `Para la interpretación y cumplimiento del presente acuerdo, las partes se someten expresamente a la competencia de los Tribunales de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.`)}
${CL("NOVENA", "LEGISLACIÓN APLICABLE", `El presente acuerdo se rige por la Ley Federal de Protección a la Propiedad Industrial, el Código Civil Federal y las disposiciones supletorias aplicables en el territorio mexicano.`)}
${P(`<strong>DÉCIMA. — FIRMAS.</strong> Leído que fue el presente acuerdo y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: reveladora, n: "PARTE REVELADORA" }, { r: receptora, n: "PARTE RECEPTORA" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}
</div>`;
            break;
          case "pagare":
            const deudor = fmt("deudor");
            const acreedor = fmt("acreedor");
            const cantidad = fmt("cantidad");
            const vencimiento = fmt("vigencia");
            const intereses = fmt("intereses");
body = `${TITLE("PAGARÉ EJECUTIVO")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, <strong>${deudor}</strong>, a quien en lo sucesivo se le denominará "EL DEUDOR", y <strong>${acreedor}</strong>, a quien en lo sucesivo se le denominará "EL ACREEDOR", celebran el presente Pagaré Ejecutivo, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> EL DEUDOR declara bajo protesta de decir verdad:")}
${P(`a) Haber recibido de EL ACREEDOR la cantidad de <strong>$${cantidad} MXN</strong> en este acto, en [efectivo / transferencia bancaria], a su entera satisfacción.<br/>b) Tener capacidad jurídica y solvencia económica para hacer frente a la obligación de pago aquí contenida.<br/>c) Que el presente pagaré constituye un título ejecutivo mercantil y que renuncia al beneficio de plazo y condición.`, "20px")}
${P("<strong>II.</strong> EL ACREEDOR declara bajo protesta de decir verdad:")}
${P(`a) Haber entregado a EL DEUDOR la cantidad de <strong>$${cantidad} MXN</strong>, la cual proviene de actividades lícitas.<br/>b) Tener capacidad jurídica para celebrar el presente acto y exigir el cumplimiento de la obligación.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente instrumento se rige por la Ley General de Títulos y Operaciones de Crédito y, de manera supletoria, por el Código de Comercio y el Código Civil Federal.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "RECONOCIMIENTO DE ADEUDO", `EL DEUDOR reconoce expresamente haber recibido de EL ACREEDOR la cantidad de <strong>$${cantidad} MXN</strong>, misma que se obliga a devolver en los términos aquí establecidos, constituyéndose en deudor solidario, llano y pagador.`)}
${CL("SEGUNDA", "FECHA DE VENCIMIENTO", `EL DEUDOR se obliga a pagar la cantidad antes señalada a más tardar el día <strong>${vencimiento}</strong>, sin necesidad de requerimiento, notificación o protesto judicial o extrajudicial alguno.`)}
${CL("TERCERA", "INTERESES MORATORIOS", `En caso de incumplimiento en la fecha de vencimiento, EL DEUDOR pagará a EL ACREEDOR intereses moratorios a una tasa del <strong>${intereses}</strong>, calculados por día natural de retraso, desde la fecha de vencimiento hasta la total liquidación del adeudo.`)}
${CL("CUARTA", "TÍTULO EJECUTIVO", `El presente pagaré constituye título ejecutivo mercantil conforme a lo dispuesto en la Ley General de Títulos y Operaciones de Crédito, y faculta a EL ACREEDOR para exigir judicialmente el pago mediante la vía ejecutiva mercantil, renunciando EL DEUDOR al beneficio de orden y excusión.`)}
${CL("QUINTA", "MORA AUTOMÁTICA", `EL DEUDOR se constituye en mora sin necesidad de requerimiento judicial o extrajudicial, bastando el simple retraso en el pago para que se generen los intereses moratorios pactados.`)}
${CL("SEXTA", "GASTOS DE COBRANZA", `Todos los gastos y costas judiciales y extrajudiciales en que incurra EL ACREEDOR para el cobro del presente pagaré serán por cuenta exclusiva de EL DEUDOR, incluyendo honorarios de abogados, los cuales se fijan en un [___]% del monto total adeudado.`)}
${CL("SÉPTIMA", "DOMICILIO", `EL DEUDOR señala como domicilio para ser requerido de pago el ubicado en [domicilio del deudor], lugar donde se tendrán por surtidas todas las notificaciones. EL ACREEDOR podrá requerir el pago en cualquiera de los domicilios conocidos de EL DEUDOR.`)}
${CL("OCTAVA", "JURISDICCIÓN", `Para la interpretación, cumplimiento y ejecución del presente pagaré, las partes se someten expresamente a la competencia de los Tribunales de la Ciudad de México, renunciando expresamente a cualquier otro fuero.`)}
${P(`<strong>NOVENA. — FIRMAS.</strong> Leído que fue el presente pagaré y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: deudor, n: "EL DEUDOR" }, { r: acreedor, n: "EL ACREEDOR" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}
</div>`;
            break;
          case "compraventa":
            const vendedor = fmt("vendedor");
            const comprador = fmt("comprador");
            const bien = fmt("bien");
            const precio = fmt("precio");
            const fechaCierre = fmt("fechaCierre");
body = `${TITLE("CONTRATO DE COMPRAVENTA DE BIENES")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, comparecen <strong>${vendedor}</strong>, a quien en lo sucesivo se le denominará "EL VENDEDOR", y <strong>${comprador}</strong>, a quien en lo sucesivo se le denominará "EL COMPRADOR", quienes celebran el presente Contrato de Compraventa, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> EL VENDEDOR declara bajo protesta de decir verdad:")}
${P(`a) Ser legítimo propietario del bien consistente en <strong>${bien}</strong>, mismo que se encuentra libre de gravámenes, hipotecas, embargos, vicios ocultos, adeudos, litigios o cualquier limitación de dominio.<br/>b) Tener capacidad jurídica y poder de disposición plena para celebrar la presente compraventa.<br/>c) Que el bien se encuentra en condiciones óptimas para su transmisión y uso conforme a su naturaleza.`, "20px")}
${P("<strong>II.</strong> EL COMPRADOR declara bajo protesta de decir verdad:")}
${P(`a) Tener capacidad jurídica y solvencia económica suficiente para adquirir el bien objeto de la presente compraventa.<br/>b) Conocer el bien, haberlo examinado y recibirlo a su entera satisfacción en el estado en que se encuentra.<br/>c) Que destinará el bien a fines lícitos y conforme a su naturaleza.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente contrato se rige por lo dispuesto en el Código Civil Federal y las disposiciones aplicables del Estado correspondiente.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "OBJETO", `EL VENDEDOR transfiere la propiedad del bien descrito como <strong>${bien}</strong>, libre de gravámenes, vicios ocultos y adeudos, a favor de EL COMPRADOR, quien lo adquiere para sí, para sus herederos y sucesores.`)}
${CL("SEGUNDA", "PRECIO", `El precio de venta convenido es de <strong>$${precio} MXN</strong>, cantidad que EL COMPRADOR paga a EL VENDEDOR en este acto en [efectivo / transferencia bancaria / cheque certificado], declarando EL VENDEDOR recibirla a su entera satisfacción, otorgando el más amplio y eficaz finiquito que en derecho proceda.`)}
${CL("TERCERA", "ENTREGA", `EL VENDEDOR se obliga a entregar a EL COMPRADOR la posesión material del bien el día <strong>${fechaCierre}</strong>, en el domicilio convenido, en el mismo estado en que fue visto y examinado por EL COMPRADOR.`)}
${CL("CUARTA", "SANEAMIENTO", `EL VENDEDOR se obliga al saneamiento para el caso de evicción, así como a responder por los vicios o defectos ocultos del bien que lo hagan impropio para el uso convenido o que disminuyan su valor, conforme a lo dispuesto en el Código Civil Federal.`)}
${CL("QUINTA", "RIESGOS", `Los riesgos del bien se transmiten a EL COMPRADOR a partir del momento de la entrega material, siendo por cuenta de EL COMPRADOR cualquier deterioro, pérdida o menoscabo posterior.`)}
${CL("SEXTA", "GASTOS", `Los gastos de escrituración, impuestos, derechos y cualquier otro erogación derivada de la presente compraventa serán por cuenta de [EL VENDEDOR / EL COMPRADOR / ambas partes por partes iguales].`)}
${CL("SÉPTIMA", "DECLARACIONES FISCALES", `EL VENDEDOR se obliga a presentar las declaraciones fiscales que correspondan por la enajenación del bien, manteniendo a EL COMPRADOR indemne de cualquier contingencia fiscal.`)}
${CL("OCTAVA", "INCUMPLIMIENTO", `En caso de incumplimiento de cualquiera de las obligaciones derivadas del presente contrato, la parte afectada podrá exigir su cumplimiento forzoso o la rescisión del mismo, más el pago de daños y perjuicios.`)}
${CL("NOVENA", "JURISDICCIÓN", `Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la competencia de los Tribunales de la Ciudad de México, renunciando a cualquier otro fuero.`)}
${CL("DÉCIMA", "LEGISLACIÓN APLICABLE", `El presente contrato se rige por las disposiciones del Código Civil Federal y las leyes supletorias aplicables en el territorio mexicano.`)}
${P(`<strong>DÉCIMA PRIMERA. — FIRMAS.</strong> Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: vendedor, n: "EL VENDEDOR" }, { r: comprador, n: "EL COMPRADOR" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}
</div>`;
            break;
          case "divorcio":
            const conyuge1 = fmt("conyuge1");
            const conyuge2 = fmt("conyuge2");
            const regimen = fmt("regimen");
            const domicilioConyugal = fmt("domicilioConyugal");
            const pension = fmt("pension");
body = `${TITLE("CONVENIO DE DIVORCIO VOLUNTARIO")}
${H("P R O E M I O")}
${P(`En la ${city}, siendo las ___ horas del día ___ de ______________ de 20___, comparecen <strong>${conyuge1}</strong> y <strong>${conyuge2}</strong>, a quienes en lo sucesivo se les denominará conjuntamente "LOS CÓNYUGES", quienes manifiestan su voluntad de disolver el vínculo matrimonial que los une de manera voluntaria y sin mediar causa de responsabilidad, al tenor de las siguientes declaraciones y cláusulas.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> LOS CÓNYUGES declaran bajo protesta de decir verdad:")}
${P(`a) Que contrajeron matrimonio civil bajo el régimen de <strong>${regimen}</strong> el día [___] de [___________] de [___].<br/>b) Que su domicilio conyugal estuvo ubicado en <strong>${domicilioConyugal}</strong>.<br/>c) Que es su voluntad expresa y libre disolver el vínculo matrimonial de común acuerdo, sin que exista coacción, dolo o violencia de ninguna naturaleza.`, "20px")}
${P("<strong>II.</strong> LOS CÓNYUGES declaran además:")}
${P(`a) Que no existen hijos menores de edad sujetos a patria potestad / que existen [___] hijos menores de edad, cuyos datos se precisarán en las cláusulas correspondientes.<br/>b) Que no existe / que existe sociedad conyugal pendiente de liquidar.<br/>c) Que el presente convenio contiene la totalidad de los acuerdos relativos a la disolución del vínculo matrimonial.`, "20px")}
${P("<strong>III.</strong> Ambas partes reconocen que el presente convenio se rige por lo dispuesto en el Código Civil Federal y en el Código Familiar del Estado correspondiente.")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "DISOLUCIÓN DEL VÍNCULO", `LOS CÓNYUGES solicitan al H. Juez Familiar competente se decrete la disolución del vínculo matrimonial que los une, mediante divorcio voluntario o incausado, en términos de lo dispuesto por el artículo correspondiente del Código Civil aplicable.`)}
${CL("SEGUNDA", "RÉGIMEN MATRIMONIAL Y LIQUIDACIÓN", `LOS CÓNYUGES declaran que su matrimonio se rigió bajo el régimen de <strong>${regimen}</strong>. En consecuencia, procederán a la liquidación de la sociedad conyugal [o no existe sociedad conyugal que liquidar], conforme al inventario y avalúo que se adjunta como anexo al presente convenio.`)}
${CL("TERCERA", "DOMICILIO CONYUGAL", `LOS CÓNYUGES acuerdan que el inmueble ubicado en <strong>${domicilioConyugal}</strong> será [ocupado por [nombre] / puesto a la venta y el producto se distribuirá en [___]% para cada cónyuge / asignado a [nombre] en pago de su parte social].`)}
${CL("CUARTA", "PENSIÓN ALIMENTICIA", `En concepto de pensión alimenticia, [nombre del cónyuge obligado] se obliga a pagar a [nombre del cónyuge beneficiario] la cantidad de <strong>$${pension} MXN</strong> mensuales, cantidad que será pagadera dentro de los primeros cinco días de cada mes y que será actualizada anualmente conforme al Índice Nacional de Precios al Consumidor.`)}
${CL("QUINTA", "HIJOS MENORES (SI LOS HUBIERE)", `En caso de existir hijos menores de edad, LOS CÓNYUGES acuerdan que la guarda y custodia provisional será ejercida por [nombre], sin perjuicio del derecho de convivencia de [nombre], el cual se ejercerá los fines de semana alternados y períodos vacacionales por mitades. El pago de alimentos para los hijos se fija en la cantidad de $[___] MXN mensuales.`)}
${CL("SEXTA", "MEDIDAS PROVISIONALES", `Como medidas provisionales, LOS CÓNYUGES acuerdan: a) La prohibición de mutuo acoso, intimidación o molestias; b) La garantía de no realizar actos de disposición de bienes comunes sin consentimiento mutuo; c) La protección recíproca de la vivienda familiar y su contenido.`)}
${CL("SÉPTIMA", "GASTOS Y COSTAS", `Cada cónyuge cubrirá sus propios gastos y honorarios de abogados, siendo los gastos comunes del juicio cubiertos por partes iguales, salvo que se obtenga beneficio de litigar sin gastos.`)}
${CL("OCTAVA", "DOMICILIOS FUTUROS", `LOS CÓNYUGES señalan como sus domicilios particulares para recibir notificaciones los siguientes: [nombre]: [domicilio]; [nombre]: [domicilio].`)}
${CL("NOVENA", "JURISDICCIÓN", `Para la interpretación y cumplimiento del presente convenio, LOS CÓNYUGES se someten expresamente a la competencia de los Juzgados Familiares de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.`)}
${CL("DÉCIMA", "LEGISLACIÓN APLICABLE", `El presente convenio se rige por las disposiciones del Código Civil Federal, el Código Familiar y las leyes supletorias aplicables.`)}
${P(`<strong>DÉCIMA PRIMERA. — FIRMAS.</strong> Leído que fue el presente convenio y enteradas las partes de su contenido y alcance legal, lo firman de conformidad en la Ciudad de México, a la fecha de su presentación.`)}
${SIGS({ r: conyuge1, n: "CÓNYUGE 1" }, { r: conyuge2, n: "CÓNYUGE 2" })}
<div style="display:flex;justify-content:space-between;margin-top:60px">
${SIG("TESTIGO", "")}${SIG("TESTIGO", "")}
</div>`;
            break;
          case "contestacion":
            const demandado = fmt("demandado");
            const materiaCont = fmt("materia");
            const cuantia = fmt("cuantia");
            const juzgado = fmt("juzgado");
body = `${TITLE("CONTESTACIÓN DE DEMANDA")}
${H("P R O E M I O")}
${P(`<strong>${demandado}</strong>, por su propio derecho, con domicilio procesal para oír y recibir notificaciones en [domicilio procesal], autorizando para oírlas en mi nombre al C. [abogado patrono], comparezco ante este H. Tribunal a dar contestación a la demanda instaurada en mi contra por la parte actora, dentro de los términos concedidos por el artículo correspondiente del Código de Procedimientos aplicable, al tenor de las siguientes consideraciones.`)}
${H("D E C L A R A C I O N E S")}
${P("<strong>I.</strong> El suscrito demandado declara bajo protesta de decir verdad:")}
${P(`a) Tener domicilio procesal en el lugar señalado y estar debidamente representado en términos de ley.<br/>b) Haber sido emplazado legalmente en el expediente <strong>${juzgado}</strong> y tener pleno conocimiento de las prestaciones reclamadas.<br/>c) Que los hechos narrados por la parte actora son [totalmente / parcialmente] falsos e inexactos, reservándome el derecho de acreditarlo en el momento procesal oportuno.`, "20px")}
${P("<strong>II.</strong> Vía de conocimiento y cuantía:")}
${P(`El presente juicio se tramita en la vía [ordinaria / ejecutiva / oral], en materia <strong>${materiaCont}</strong>, con una cuantía de <strong>$${cuantia} MXN</strong>. En términos de lo dispuesto por los artículos [___] del Código de Procedimientos aplicable, la vía promovida es la correcta / no es la correcta, por lo que se impugna la vía elegida.`, "20px")}
${H("C L Á U S U L A S")}
${CL("PRIMERA", "OPOSICIÓN", `Me opongo en todas y cada una de sus partes a las prestaciones reclamadas por la parte actora, en virtud de que carecen de fundamento legal y fáctico, como se demostrará en el momento procesal oportuno mediante las pruebas que se ofrecen en el presente escrito.`)}
${CL("SEGUNDA", "EXCEPCIONES DE FONDO", `Hago valer las siguientes excepciones y defensas: 1) Falta de acción y de derecho de la parte actora para reclamar las prestaciones que exige; 2) Falta de legitimación activa y pasiva; 3) Improcedencia de la vía elegida; 4) Caducidad y prescripción de la acción intentada; 5) Pago, compensación y condonación de la deuda, en su caso.`)}
${CL("TERCERA", "EXCEPCIONES PROCESALES", `Asimismo hago valer las siguientes excepciones procesales: 1) Falta de personalidad del apoderado de la parte actora; 2) Incompetencia del H. Tribunal; 3) Litispendencia; 4) Conexidad de la causa; 5) Obscuridad e imprecisión en el planteamiento de las prestaciones reclamadas.`)}
${CL("CUARTA", "HECHOS", `Los hechos narrados por la parte actora se contestan de la siguiente manera: a) [Se niega el hecho señalado como [___] por ser falso]; b) [Se niega el hecho señalado como [___] por no constarle]; c) [Se admite parcialmente el hecho señalado como [___], precisando que [___]]. Se dejan expresamente controvertidos todos y cada uno de los hechos narrados por la parte actora que no sean reconocidos de manera expresa.`)}
${CL("QUINTA", "PRUEBAS", `Ofrezco las siguientes pruebas: 1) Documental pública, consistente en [___]; 2) Documental privada, consistente en [___]; 3) Testimonial a cargo de [___]; 4) Pericial en materia de [___]; 5) Confesional a cargo de la parte actora; 6) Instrumental de actuaciones; 7) Presuncional en su doble aspecto legal y humano.`)}
${CL("SEXTA", "MEDIDAS CAUTELARES", `Solicito a este H. Tribunal se sirva decretar las siguientes medidas cautelares: a) El aseguramiento de bienes suficientes para garantizar el resultado del juicio; b) La prohibición de celebrar actos de disposición sobre los bienes materia del juicio; c) Las demás que este H. Tribunal estime necesarias para garantizar que no se cause un daño irreparable a la suscrita.`)}
${CL("SÉPTIMA", "DOMICILIO PROCESAL", `Señalo como domicilio procesal para oír y recibir notificaciones el ubicado en [domicilio], autorizando para tales efectos a los CC. [abogados], en términos del artículo correspondiente del Código de Procedimientos aplicable.`)}
${CL("OCTAVA", "JURISDICCIÓN", `Este H. Tribunal es competente para conocer del presente asunto en razón de la materia, cuantía y territorio, con fundamento en los artículos [___] del Código de Procedimientos aplicable.`)}
${P(`<strong>POR LO ANTERIORMENTE EXPUESTO Y FUNDADO, A ESTE H. JUZGADO ATENTAMENTE PIDO:</strong>`)}
${P(`PRIMERO. — Tener por presentada en tiempo y forma la contestación de demanda en el expediente <strong>${juzgado}</strong>.<br/>SEGUNDO. — Tener por opuestas las excepciones y defensas hechas valer.<br/>TERCERO. — Tener por ofrecidas las pruebas relacionadas y admitirlas para su desahogo en la etapa procesal correspondiente.<br/>CUARTO. — En el momento procesal oportuno, absolver a la suscrita de todas y cada una de las prestaciones reclamadas por la parte actora, condenándola al pago de costas y gastos del juicio.`)}
${H("F I R M A S")}
${P(`<strong>${demandado}</strong>`)}
${P(`Abogado Patrono: [Nombre del abogado]`)}
${P("")}
<div style="display:flex;justify-content:center;margin-top:40px">
${SIG(demandado, "DEMANDADO")}
</div>`;
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
      addPlazo,
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
      caseQuery,
      setCaseQuery,
      members,
      activeAnalysis,
      analysisLoading,
      selectedTemplate,
      documentPreview,
      docGenLoading,
      analyzeContract,
      generateCustomDocument,
      setSelectedTemplate,
      systemUsage,
      referralData,
    }),
    [
      view,
      setView,
      cases,
      recentCases,
      members,
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
      addPlazo,
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
      caseQuery,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
