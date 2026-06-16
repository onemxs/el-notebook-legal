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
  ExtractedCase,
  ExtractedField,
  Law,
  SystemSettings,
  TimelineEvent,
  TimelineSeverity,
} from "./types";
import { BRANCHES } from "./branches";
import { askAssistant } from "./ai";
import { analyzeExpediente } from "./intake";
import { analyzeDocument, generateDocumentAI } from "./claude";
import { kindFromName } from "./files";
import { generateTimeline, generateDocument, getDocKindsForBranch, type DocKind } from "./generators";

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

const cloneLaws = (id: BranchId): Law[] => BRANCHES[id].laws.map((l) => ({ ...l }));

interface WorkspaceState {
  view: AppView;
  cases: CaseSummary[];
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
  editorHtml: string;
  editorVersion: number;
  activeArticle: Citation | null;
  settings: SystemSettings;
  generatingDoc: boolean;
  caseParties: ExtractedField[];
  caseDocContent: string[];
}

interface WorkspaceCtx extends WorkspaceState {
  goHome: () => void;
  openCase: (id: string) => void;
  openCaseModal: (preset?: BranchId) => void;
  closeCaseModal: () => void;
  startIntake: (file: File) => void;
  clearIntake: () => void;
  startCase: (branch: BranchId, name: string) => void;
  toggleLaw: (lawId: string) => void;
  addFiles: (files: CaseFile[]) => void;
  ingestDocument: (file: File) => void;
  seedFromExtraction: (fileName: string, res: ExtractedCase) => void;
  removeFile: (id: string) => void;
  sendMessage: (text: string) => void;
  runTimeline: () => void;
  clearTimeline: () => void;
  openArticle: (c: Citation) => void;
  closeArticle: () => void;
  setEditorHtml: (html: string) => void;
  insertDocument: (kind: DocKind) => void;
  docKindsForBranch: DocKind[];
  updateSettings: (patch: Partial<SystemSettings>) => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

const DEFAULT_BRANCH: BranchId = "mercantil";

const initialSettings: SystemSettings = {
  model: "profundo",
  temperature: 0,
  secureSession: false,
  datasetUpdatedAt: "10 jun 2026",
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
  const [view, setView] = useState<AppView>("dashboard");
  const [cases, setCases] = useState<CaseSummary[]>(SEED_CASES);
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
  const [ingestedEvents, setIngestedEvents] = useState<TimelineEvent[]>([]);
  const [editorHtml, setEditorHtmlState] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);
  const [activeArticle, setActiveArticle] = useState<Citation | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [caseParties, setCaseParties] = useState<ExtractedField[]>([]);
  const [caseDocContent, setCaseDocContent] = useState<string[]>([]);

  const filesRef = useRef(files);
  filesRef.current = files;
  const ingestedEventsRef = useRef(ingestedEvents);
  ingestedEventsRef.current = ingestedEvents;
  const branchRef = useRef(branch);
  branchRef.current = branch;

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
    (next: BranchId, name: string) => {
      const finalName = name.trim() || `Caso ${BRANCHES[next].name}`;
      const id = uid("c");
      setCases((prev) => [
        { id, name: finalName, branch: next, updated: "ahora" },
        ...prev.filter((c) => c.name !== finalName),
      ]);
      loadCase(next, finalName);
      setCaseModalOpen(false);
      setCaseModalPreset(null);
    },
    [loadCase],
  );

  const openCase = useCallback(
    (id: string) => {
      const found = cases.find((c) => c.id === id);
      if (found) loadCase(found.branch, found.name, found.demo);
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

  const toggleLaw = useCallback((lawId: string) => {
    setLaws((prev) =>
      prev.map((l) => (l.id === lawId ? { ...l, enabled: !l.enabled } : l)),
    );
  }, []);

  const addFiles = useCallback((next: CaseFile[]) => {
    setFiles((prev) => [...next, ...prev]);
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
      void runAssistant(clean, branch, laws);
    },
    [branch, laws, thinking, runAssistant],
  );

  // Manual (re)build: show the real ingested events when there are any; otherwise
  // synthesize a branch-specific reference chronology so the feature is previewable.
  const runTimeline = useCallback(() => {
    setTimelineLoading(true);
    setTimeout(() => {
      const real = ingestedEventsRef.current;
      const base = real.length
        ? real
        : generateTimeline(branchRef.current, filesRef.current);
      setTimeline([...base].sort(byChrono));
      setTimelineLoading(false);
    }, 900);
  }, []);

  const clearTimeline = useCallback(() => setTimeline(null), []);

  const openArticle = useCallback((c: Citation) => setActiveArticle(c), []);
  const closeArticle = useCallback(() => setActiveArticle(null), []);

  const setEditorHtml = useCallback((html: string) => setEditorHtmlState(html), []);

  const casePartiesRef = useRef(caseParties);
  casePartiesRef.current = caseParties;
  const caseDocContentRef = useRef(caseDocContent);
  caseDocContentRef.current = caseDocContent;
  const caseNameRef = useRef(caseName);
  caseNameRef.current = caseName;

  const insertDocument = useCallback(
    (kind: DocKind) => {
      const currentBranch = branchRef.current;
      const currentName = caseNameRef.current;
      const currentParties = casePartiesRef.current;
      const currentDocs = caseDocContentRef.current;

      const hasContext = currentParties.length > 0 || currentDocs.length > 0;

      if (!hasContext) {
        const html = generateDocument(kind, currentBranch, currentName);
        setEditorHtmlState((prev) => (prev ? `${prev}<hr/>${html}` : html));
        setEditorVersion((v) => v + 1);
        return;
      }

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

  // Secure session: wipe client + (in prod) Supabase vectors on tab close.
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

  const value = useMemo<WorkspaceCtx>(
    () => ({
      view,
      cases,
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
      ingestDocument,
      seedFromExtraction,
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
      docKindsForBranch,
      updateSettings,
    }),
    [
      view,
      cases,
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
      ingestDocument,
      seedFromExtraction,
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
      docKindsForBranch,
      updateSettings,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
