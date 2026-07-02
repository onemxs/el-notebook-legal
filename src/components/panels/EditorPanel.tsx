import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PenLine,
  CalendarClock,
  FileSignature,
  ChevronDown,
  Sparkles,
  FilePlus2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { Timeline } from "@/components/editor/Timeline";
import { ExportModal } from "@/components/export/ExportModal";
import { DOC_LABELS, type DocKind } from "@/lib/generators";
import { auditarVigencia, extraerCitas, type CitaAuditada } from "@/lib/vigencia";

// Semáforo de la Auditoría de Vigencia Normativa (verde · amarillo · rojo).
const VIGENCIA_DOT: Record<CitaAuditada["estado"], string> = {
  vigente: "bg-green-500",
  revisar: "bg-amber-500",
  no_localizado: "bg-amber-500",
  derogado: "bg-red-500",
};

function AuditoriaVigencia({
  results,
  running,
  onClose,
}: {
  results: CitaAuditada[];
  running: boolean;
  onClose: () => void;
}) {
  const n = (e: CitaAuditada["estado"][]) => results.filter((r) => e.includes(r.estado)).length;
  return (
    <div className="border-b border-hairline bg-panel-solid/70 px-4 py-2.5 backdrop-blur-md animate-fade-in">
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} className="shrink-0 text-accent" />
        <p className="text-[12px] font-semibold text-ink">Auditoría de Vigencia Normativa</p>
        {!running && results.length > 0 && (
          <span className="flex items-center gap-2 text-[11px] text-ink-subtle">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> {n(["vigente"])}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> {n(["revisar", "no_localizado"])}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> {n(["derogado"])}
            </span>
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          aria-label="Cerrar auditoría"
        >
          <X size={13} />
        </button>
      </div>
      {running ? (
        <p className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-muted">
          <Loader2 size={13} className="animate-spin text-accent" />
          Escaneando citas y cruzándolas con el corpus oficial…
        </p>
      ) : results.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">
          No se detectaron citas de artículos en el escrito.
        </p>
      ) : (
        <ul className="scroll-zone mt-2 max-h-36 space-y-1 overflow-y-auto">
          {results.map((r) => (
            <li key={`${r.codigo}-${r.articulo}`} className="flex items-start gap-2 text-[12px]">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${VIGENCIA_DOT[r.estado]}`} />
              <span className="font-semibold text-ink">
                {r.codigo} Art. {r.articulo}
              </span>
              <span className="min-w-0 truncate text-ink-muted">{r.nota}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type View = "editor" | "timeline";

function SegBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
        active
          ? "bg-panel-solid text-ink shadow-card"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function EditorPanel() {
  const {
    caseName,
    caseIsDemo,
    editorHtml,
    editorVersion,
    setEditorHtml,
    insertDocument,
    generatingDoc,
    docKindsForBranch,
  } = useWorkspace();
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("editor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [audit, setAudit] = useState<{ running: boolean; results: CitaAuditada[] } | null>(null);

  const runAudit = async () => {
    setAudit({ running: true, results: [] });
    const citas = extraerCitas(ref.current?.innerText ?? "");
    setAudit({ running: false, results: await auditarVigencia(citas) });
  };

  // Sync external content (generated documents / new case) into the editable DOM
  // only on version bumps to avoid clobbering the caret while typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== editorHtml) {
      ref.current.innerHTML = editorHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorVersion]);

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    setEditorHtml(ref.current?.innerHTML ?? "");
  };

  const onPickDoc = (kind: DocKind) => {
    insertDocument(kind);
    setMenuOpen(false);
    setView("editor");
  };

  return (
    <section className="flex h-full w-full flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
        <div className="min-w-0">
          <p className="label-caps text-[10px] text-ink-subtle">Despacho Central</p>
          <div className="flex items-center gap-2">
            <h1 className="truncate font-serif text-lg font-medium leading-tight text-ink">
              {caseName}
            </h1>
            {caseIsDemo && (
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                Ejemplo
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-full bg-elevated p-1">
          <SegBtn
            active={view === "editor"}
            onClick={() => setView("editor")}
            icon={<PenLine size={15} />}
          >
            Editor
          </SegBtn>
          <SegBtn
            active={view === "timeline"}
            onClick={() => setView("timeline")}
            icon={<CalendarClock size={15} />}
          >
            Línea del Tiempo
          </SegBtn>
        </div>
      </header>

      {view === "editor" ? (
        <>
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-2">
            <EditorToolbar exec={exec} />
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={runAudit}
                title="Auditoría de vigencia normativa — valida los artículos citados contra el corpus oficial"
                aria-label="Auditar vigencia"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/20 bg-green-500/5 text-green-600 transition-colors hover:bg-green-500/10 dark:bg-green-500/10 dark:text-green-400 cursor-pointer"
              >
                <ShieldCheck size={15} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-hairline bg-panel-solid px-3.5 py-1.5 text-[13px] font-medium text-ink shadow-card transition-colors hover:bg-elevated cursor-pointer"
                >
                  <Sparkles size={15} className="text-accent" />
                  Generar
                  <ChevronDown size={14} className="text-ink-subtle" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-hairline bg-panel-solid shadow-float animate-scale-in">
                      <p className="border-b border-hairline px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                        Escrito legal contextual
                      </p>
                      {docKindsForBranch.map((k) => (
                        <button
                          key={k}
                          onClick={() => onPickDoc(k)}
                          disabled={generatingDoc}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FilePlus2 size={15} className="text-accent" />
                          {DOC_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
              >
                <FileSignature size={15} />
                Exportar
              </button>
            </div>
          </div>

          {audit && (
            <AuditoriaVigencia
              results={audit.results}
              running={audit.running}
              onClose={() => setAudit(null)}
            />
          )}

          <div className="scroll-zone flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-[760px] rounded-2xl border border-hairline paper px-8 py-9 shadow-card sm:px-12 sm:py-12 min-h-[60vh] relative">
              {generatingDoc && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-panel-solid/80 backdrop-blur-sm">
                  <Loader2 size={32} className="animate-spin text-accent mb-4" />
                  <p className="text-sm font-medium text-ink mb-6 text-center px-4">
                    Analizando evidencias del expediente y redactando fundamentos legales reales…
                  </p>
                  <div className="w-full max-w-[500px] space-y-3 px-8">
                    <div className="h-4 w-3/4 rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-full rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-5/6 rounded bg-elevated animate-pulse" />
                    <div className="h-6 mt-4 w-1/3 rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-full rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-4/5 rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-full rounded bg-elevated animate-pulse" />
                    <div className="h-6 mt-4 w-2/5 rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-full rounded bg-elevated animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-elevated animate-pulse" />
                  </div>
                </div>
              )}
              <div
                ref={ref}
                contentEditable={!generatingDoc}
                suppressContentEditableWarning
                onInput={() => setEditorHtml(ref.current?.innerHTML ?? "")}
                data-placeholder="Empieza a redactar el caso, o usa «Generar» para crear un escrito legal contextual basado en tu expediente…"
                className="prose-legal min-h-[50vh] max-w-none outline-none relative before:content-[attr(data-placeholder)] before:absolute before:text-ink-subtle/50 before:pointer-events-none empty:before:block before:hidden"
                aria-label="Editor de documento legal"
                role="textbox"
                aria-multiline="true"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="scroll-zone flex-1 overflow-y-auto">
          <Timeline />
        </div>
      )}

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </section>
  );
}
