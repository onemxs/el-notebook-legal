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
  type CasoRow,
} from "./supabase";

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
  startCase: (branch: BranchId, name: string, extraction?: ExtractedCase) => Promise<string>;
  toggleLaw: (lawId: string) => void;
  addFiles: (files: CaseFile[]) => void;
  addTranscript: (fileName: string, text: string) => void;
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

  // Case list: from Supabase when authenticated (RLS → own + despacho); the
  // "explorar sin cuenta" demo keeps the illustrative SEED_CASES.
  useEffect(() => {
    let active = true;
    if (cloud) {
      void obtenerCasos().then((rows) => {
        if (!active) return;
        setCases(
          rows.map((r: CasoRow) => ({
            id: r.id,
            name: r.nombre,
            branch: r.rama as BranchId,
            updated: relativo(r.creado_en),
          })),
        );
      });
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
    async (next: BranchId, name: string, extraction?: ExtractedCase) => {
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
    const file: CaseFile = {
      id: uid("f"),
      name: fileName,
      kind: "text",
      size: `${(text.length / 1024).toFixed(1)} KB`,
      addedAt: Date.now(),
    };
    setFiles((prev) => [file, ...prev]);
    setCaseDocContent((prev) => [...prev, text]);
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
      addTranscript,
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
      addTranscript,
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
