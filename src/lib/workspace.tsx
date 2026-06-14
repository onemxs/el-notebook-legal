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
} from "./types";
import { BRANCHES } from "./branches";
import { askAssistant } from "./ai";
import { analyzeExpediente } from "./intake";
import { analyzeDocument } from "./claude";
import { kindFromName } from "./files";
import { generateTimeline, generateDocument, type DocKind } from "./generators";

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
  removeFile: (id: string) => void;
  sendMessage: (text: string) => void;
  runTimeline: () => void;
  clearTimeline: () => void;
  openArticle: (c: Citation) => void;
  closeArticle: () => void;
  setEditorHtml: (html: string) => void;
  insertDocument: (kind: DocKind) => void;
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

const SEED_CASES: CaseSummary[] = [
  {
    id: "c-demo-1",
    name: "Juicio Ejecutivo Mercantil 482/2026",
    branch: "mercantil",
    updated: "hace 2 horas",
    deadlineLabel: "Prescripción cambiaria · 3 años",
  },
  {
    id: "c-demo-2",
    name: "Despido · García vs. Industrias del Norte",
    branch: "laboral",
    updated: "ayer",
    deadlineLabel: "Prescripción 2 meses (art. 518)",
    urgent: true,
  },
  {
    id: "c-demo-3",
    name: "Amparo indirecto 211/2026",
    branch: "amparo",
    updated: "hace 3 días",
    deadlineLabel: "Plazo 15 días (art. 17)",
    urgent: true,
  },
  {
    id: "c-demo-4",
    name: "Revisión de contrato de arrendamiento",
    branch: "civil",
    updated: "hace 1 semana",
  },
];

const MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

function parseSpanishDate(v: string): number {
  const m = v.toLowerCase().match(/(\d{1,2})\s+([a-z]{3})\w*\s+(\d{4})/);
  if (m && MONTHS[m[2]] !== undefined) {
    return new Date(+m[3], MONTHS[m[2]], +m[1]).getTime();
  }
  return NaN;
}

/** Turn an extracted key-date into a timeline event (deadlines flagged). */
function fieldToEvent(field: ExtractedField, fileName: string): TimelineEvent {
  const t = parseSpanishDate(field.value);
  const isDeadline = /vence|prescrip|plazo|t[ée]rmino|recurso/i.test(field.label);
  return {
    id: uid("de"),
    date: field.value,
    iso: Number.isNaN(t) ? new Date(Date.now() + n * 1000).toISOString() : new Date(t).toISOString(),
    title: field.label,
    detail: `Dato extraído de ${fileName}.`,
    severity: isDeadline ? "deadline" : "info",
  };
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("dashboard");
  const [cases, setCases] = useState<CaseSummary[]>(SEED_CASES);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseModalPreset, setCaseModalPreset] = useState<BranchId | null>(null);
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [branch, setBranch] = useState<BranchId>(DEFAULT_BRANCH);
  const [caseName, setCaseName] = useState("Expediente de demostración");
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

  const filesRef = useRef(files);
  filesRef.current = files;
  const ingestedEventsRef = useRef(ingestedEvents);
  ingestedEventsRef.current = ingestedEvents;
  const branchRef = useRef(branch);
  branchRef.current = branch;

  const loadCase = useCallback((next: BranchId, name: string) => {
    setBranch(next);
    setCaseName(name.trim() || `Caso ${BRANCHES[next].name}`);
    setLaws(cloneLaws(next));
    setFiles([]);
    setTimeline(null);
    setIngestedEvents([]);
    setActiveArticle(null);
    setEditorHtmlState("");
    setEditorVersion((v) => v + 1);
    setMessages([welcomeMessage(next)]);
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
      if (found) loadCase(found.branch, found.name);
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
      // Real analysis with Claude when configured; demo responder otherwise.
      const res =
        (await analyzeDocument(file, branch)) ??
        (await analyzeExpediente(fileName, undefined, branch));
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, analyzing: false, size: "expediente" } : f)),
      );
      const events = res.keyDates.map((d) => fieldToEvent(d, fileName));
      setIngestedEvents((prev) => [...prev, ...events]);
      setTimeline((prev) =>
        prev
          ? [...prev, ...events].sort((a, b) => +new Date(a.iso) - +new Date(b.iso))
          : prev,
      );
      setMessages((prev) => [...prev, ingestMessage(fileName, res)]);
    })();
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

  const runTimeline = useCallback(() => {
    setTimelineLoading(true);
    setTimeout(() => {
      const merged = [...generateTimeline(branch, filesRef.current), ...ingestedEventsRef.current];
      merged.sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
      setTimeline(merged);
      setTimelineLoading(false);
    }, 1100);
  }, [branch]);

  const clearTimeline = useCallback(() => setTimeline(null), []);

  const openArticle = useCallback((c: Citation) => setActiveArticle(c), []);
  const closeArticle = useCallback(() => setActiveArticle(null), []);

  const setEditorHtml = useCallback((html: string) => setEditorHtmlState(html), []);

  const insertDocument = useCallback(
    (kind: DocKind) => {
      const html = generateDocument(kind, branch, caseName);
      setEditorHtmlState((prev) => (prev ? `${prev}<hr/>${html}` : html));
      setEditorVersion((v) => v + 1);
    },
    [branch, caseName],
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

  const value = useMemo<WorkspaceCtx>(
    () => ({
      view,
      cases,
      caseModalOpen,
      caseModalPreset,
      intakeFile,
      branch,
      caseName,
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
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
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
      removeFile,
      sendMessage,
      runTimeline,
      clearTimeline,
      openArticle,
      closeArticle,
      setEditorHtml,
      insertDocument,
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
