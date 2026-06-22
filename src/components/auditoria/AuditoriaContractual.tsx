import { useRef, useState } from "react";
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  ChevronDown,
  Loader2,
  ClipboardCopy,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";

export function AuditoriaContractual() {
  const { activeAnalysis, analysisLoading, analyzeContract } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = (list: FileList | null) => {
    if (!list || !list.length) return;
    analyzeContract(list[0]);
  };

  const riskPct = activeAnalysis?.riskScore ?? 0;
  const riskColor =
    riskPct >= 70 ? "text-danger" : riskPct >= 40 ? "text-warning" : "text-success";
  const riskBg =
    riskPct >= 70 ? "bg-danger" : riskPct >= 40 ? "bg-warning" : "bg-success";
  const riskCanvas =
    riskPct >= 70 ? "bg-danger-soft" : riskPct >= 40 ? "bg-warning-soft" : "bg-success/10";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — dropzone */}
      <div className="flex w-[22vw] min-w-[268px] max-w-[360px] shrink-0 flex-col border-r border-hairline bg-aside p-4">
        <h2 className="mb-1 font-serif text-base font-semibold text-ink">Auditoría Contractual</h2>
        <p className="mb-4 text-xs text-ink-muted">Arrastra un contrato para analizar sus cláusulas</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); ingest(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-all ${
            dragging
              ? "border-accent bg-accent-soft"
              : "border-hairline bg-panel-solid/30 hover:border-accent/50 hover:bg-accent-soft/30"
          }`}
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${dragging ? "bg-accent text-white" : "bg-elevated text-accent"}`}>
            <UploadCloud size={22} strokeWidth={1.75} />
          </span>
          <p className="text-sm font-medium text-ink">Suelta tu contrato aquí</p>
          <p className="flex items-center gap-1 text-xs text-ink-subtle">
            <Sparkles size={11} className="text-accent" />
            PDF, Word — la IA analiza cláusulas y riesgos
          </p>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => ingest(e.target.files)} />
        </div>

        {/* Risk thermometer */}
        {analysisLoading ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-panel-solid/60 px-4 py-8 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm text-ink-muted">Analizando contrato y detectando cláusulas críticas…</p>
          </div>
        ) : activeAnalysis ? (
          <div className="mt-5 space-y-4">
            <div className={`rounded-xl ${riskCanvas} px-4 py-4 text-center`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Índice de riesgo</p>
              <div className="relative mx-auto mt-3 h-3 w-full max-w-[200px] rounded-full bg-hairline">
                <div
                  className={`h-full rounded-full ${riskBg} transition-all duration-700`}
                  style={{ width: `${riskPct}%` }}
                />
              </div>
              <p className={`mt-2 text-3xl font-bold ${riskColor}`}>{riskPct}<span className="text-sm font-medium">/100</span></p>
              <p className="mt-1 text-xs text-ink-muted">
                {riskPct >= 70 ? "Alto — requiere negociación urgente" : riskPct >= 40 ? "Moderado — revisar cláusulas señaladas" : "Bajo — contrato equilibrado"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right content — 4-block grid */}
      <div className="flex-1 overflow-y-auto scroll-zone p-5">
        {!activeAnalysis && !analysisLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <FileSearch size={28} strokeWidth={1.5} />
            </span>
            <h3 className="text-base font-semibold text-ink">Arrastra un contrato para comenzar</h3>
            <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
              La IA analizará cláusulas, detectará riesgos y propondrá alternativas de negociación.
            </p>
          </div>
        ) : analysisLoading ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-accent" />
              <p className="text-sm text-ink-muted">Procesando documento…</p>
            </div>
          </div>
        ) : activeAnalysis ? (
          <div className="mx-auto max-w-5xl space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <FileText size={16} className="text-accent" />
              Resultados del análisis
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Block 1 — Pros */}
              <div className="rounded-xl border border-success/20 bg-success/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                    <CheckCircle2 size={18} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-success">Puntos favorables</span>
                </div>
                <ul className="space-y-2">
                  {activeAnalysis.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-ink">
                      <span className="mt-0.5 shrink-0 text-success">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Block 2 — Cons / Riesgos */}
              <div className="rounded-xl border border-danger/20 bg-danger/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft text-danger">
                    <AlertTriangle size={18} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-danger">Riesgos y letras chiquitas</span>
                </div>
                <ul className="space-y-2">
                  {activeAnalysis.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-ink">
                      <span className="mt-0.5 shrink-0 text-danger">✗</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Block 3 — Strategy */}
            <div className="rounded-xl border border-accent/15 bg-accent/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Lightbulb size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">Estrategia sugerida</span>
              </div>
              <p className="text-[13px] leading-relaxed text-ink">{activeAnalysis.strategy}</p>
            </div>

            {/* Block 4 — Critical clauses */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Cláusulas críticas detectadas</h4>
              <div className="space-y-3">
                {activeAnalysis.criticalClauses.map((cl, i) => (
                  <ClauseAccordion key={i} clause={cl} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClauseAccordion({ clause }: { clause: { title: string; currentText: string; alternativeText: string } }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(clause.alternativeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-panel-solid/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-soft/30 cursor-pointer"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <FileText size={14} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">{clause.title}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="animate-slide-up space-y-3 border-t border-hairline px-4 py-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Texto original</p>
            <div className="rounded-lg bg-canvas p-3 text-[13px] leading-relaxed text-ink-muted">
              “{clause.currentText}”
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Texto alternativo recomendado</p>
              <button
                onClick={copy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent cursor-pointer"
              >
                <ClipboardCopy size={13} />
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="rounded-lg border border-accent/20 bg-accent/[0.04] p-3 text-[13px] leading-relaxed text-ink">
              “{clause.alternativeText}”
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileSearch({ size, strokeWidth, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}
