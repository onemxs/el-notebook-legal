import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PenLine,
  CalendarClock,
  FileSignature,
  ChevronDown,
  Sparkles,
  FilePlus2,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { Timeline } from "@/components/editor/Timeline";
import { ExportModal } from "@/components/export/ExportModal";
import { DOC_LABELS, type DocKind } from "@/lib/generators";

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
  const { caseName, editorHtml, editorVersion, setEditorHtml, insertDocument } =
    useWorkspace();
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("editor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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
          <h1 className="truncate font-serif text-lg font-medium leading-tight text-ink">
            {caseName}
          </h1>
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
                        Plantilla formal mexicana
                      </p>
                      {(Object.keys(DOC_LABELS) as DocKind[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => onPickDoc(k)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer"
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

          <div className="scroll-zone flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-[760px] rounded-2xl border border-hairline paper px-8 py-9 shadow-card sm:px-12 sm:py-12 min-h-[60vh]">
              <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onInput={() => setEditorHtml(ref.current?.innerHTML ?? "")}
                data-placeholder="Empieza a redactar el caso, o usa «Generar» para crear una demanda, contestación, alegatos o amparo con formato legal mexicano…"
                className="prose-legal min-h-[50vh] max-w-none outline-none"
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
