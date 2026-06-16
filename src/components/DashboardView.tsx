import { useRef, useState, type ReactNode } from "react";
import {
  FolderPlus,
  AlarmClock,
  FolderOpen,
  Scale,
  Database,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ScanText,
  Pencil,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { BRANCH_LIST, BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import type { CaseSummary } from "@/lib/types";

function today(): string {
  try {
    const s = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return "";
  }
}

function extractDaysFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*d/i);
  return match ? parseInt(match[1], 10) : Infinity;
}

function StatCard({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
      {tone === "danger" && (
        <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-danger animate-pulse" />
      )}
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-serif text-3xl font-medium leading-none text-ink tabular">{value}</p>
        <p className="mt-1.5 truncate text-[11px] uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

function CaseCard({ c, onOpen }: { c: CaseSummary; onOpen: () => void }) {
  const b = BRANCHES[c.branch];
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-hairline bg-panel-solid p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-float active:translate-y-0 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <BranchIcon id={c.branch} size={18} />
        </span>
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          {b.name}
        </span>
        <ChevronRight
          size={16}
          className="ml-auto text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <p className="mt-3 line-clamp-2 font-serif text-[17px] font-medium leading-snug text-ink">
        {c.name}
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-subtle">
        <Clock size={12} />
        {c.updated}
      </div>
      {c.deadlineLabel && (
        <div
          className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
            c.urgent ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
          }`}
        >
          <AlertTriangle size={12} />
          <span className="truncate">{c.deadlineLabel}</span>
        </div>
      )}
    </button>
  );
}

export function DashboardView() {
  const { cases, openCase, openCaseModal, startIntake, settings } = useWorkspace();
  const upcoming = cases.filter((c) => c.deadlineLabel).length;
  const [dragging, setDragging] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const filters = [
    { id: "all", label: "Todos" },
    { id: "urgent", label: "Urgentes ⚠️" },
    { id: "amparo", label: "Amparo" },
    { id: "mercantil", label: "Mercantil" },
    { id: "laboral", label: "Laboral" },
  ];

  const filteredCases = cases.filter((c) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "urgent") return c.deadlineLabel;
    if (activeFilter === "amparo") return c.branch === "amparo";
    if (activeFilter === "mercantil") return c.branch === "mercantil";
    if (activeFilter === "laboral") return c.branch === "laboral";
    return true;
  });

  const upcomingDeadlines = cases
    .filter((c): c is typeof c & { deadlineLabel: string } => !!c.deadlineLabel)
    .sort((a, b) => {
      const daysA = extractDaysFromLabel(a.deadlineLabel);
      const daysB = extractDaysFromLabel(b.deadlineLabel);
      return daysA - daysB;
    })
    .slice(0, 5);

  const onFile = (list: FileList | null) => {
    const f = list?.[0];
    if (f) startIntake(f);
  };

  return (
    <div className="scroll-zone h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* Hero — AI intake */}
        <section className="relative overflow-hidden rounded-3xl border border-hairline bg-panel-solid p-6 shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-soft blur-2xl" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                {today()}
              </p>
              <h1 className="mt-2 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Bienvenido de vuelta
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-muted">
                Arrastra un expediente y la IA lo lee, extrae los datos generales y{" "}
                <span className="font-medium text-ink">detecta la rama del derecho</span>{" "}
                para armar el caso por ti.
              </p>
              <button
                onClick={() => openCaseModal()}
                className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-accent cursor-pointer"
              >
                <Pencil size={14} />
                o crear un expediente manualmente
              </button>
            </div>

            {/* Intelligent intake dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFile(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 ${
                dragging
                  ? "border-accent bg-accent-soft scale-[1.01]"
                  : "border-accent/35 bg-accent-soft/30 hover:border-accent hover:bg-accent-soft/60"
              }`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                  dragging ? "bg-accent text-white" : "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"
                }`}
              >
                <ScanText size={26} strokeWidth={1.6} />
              </span>
              <p className="mt-1 text-sm font-semibold text-ink">
                Arrastra el expediente del cliente
              </p>
              <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
                PDF, Word o imagen. La IA crea el caso, detecta la rama y carga el documento
                al Archivero.
              </p>
              <span className="mt-1 flex items-center gap-1.5 rounded-full bg-panel-solid px-3 py-1.5 text-[12px] font-semibold text-accent shadow-sm">
                <Sparkles size={13} />
                Analizar con IA
              </span>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<FolderOpen size={20} strokeWidth={1.75} />}
            value={cases.length}
            label="Expedientes activos"
          />
          <StatCard
            icon={<AlarmClock size={20} strokeWidth={1.75} />}
            value={upcoming}
            label="Plazos por vigilar"
            tone="danger"
          />
          <StatCard
            icon={<Scale size={20} strokeWidth={1.75} />}
            value={9}
            label="Ramas del derecho"
          />
          <StatCard
            icon={<Database size={20} strokeWidth={1.75} />}
            value={settings.datasetUpdatedAt}
            label="Dataset actualizado"
          />
        </section>

        {/* Cases section with filters + deadlines widget */}
        <section className="mt-8 flex flex-col gap-5 lg:flex-row lg:gap-6">
          {/* Main cases area */}
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-medium text-ink">Mis expedientes</h2>
              <button
                onClick={() => openCaseModal()}
                className="flex items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover cursor-pointer"
              >
                Nuevo
                <FolderPlus size={14} />
              </button>
            </div>

            {/* Quick filter pills */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                    activeFilter === f.id
                      ? "bg-accent text-white shadow-sm"
                      : "border border-hairline bg-panel-solid text-ink-muted hover:border-accent/40 hover:bg-accent-soft/40"
                  }`}
                >
                  <Filter size={11} className="mb-0.5 mr-1 inline" />
                  {f.label}
                </button>
              ))}
            </div>

            {/* Cases grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCases.map((c) => (
                <CaseCard key={c.id} c={c} onOpen={() => openCase(c.id)} />
              ))}
            </div>
            {filteredCases.length === 0 && (
              <div className="rounded-xl border border-hairline bg-panel-solid/50 p-6 text-center">
                <p className="text-sm text-ink-muted">No hay expedientes que coincidan con el filtro seleccionado.</p>
              </div>
            )}
          </div>

          {/* Deadlines widget (sidebar) */}
          <aside className="w-full lg:w-72">
            <div className="rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-warning" />
                <h3 className="font-serif text-lg font-medium text-ink">Plazos Críticos</h3>
              </div>
              <p className="mb-4 text-xs text-ink-muted">Próximos vencimientos ordenados por urgencia</p>
              {upcomingDeadlines.length > 0 ? (
                <ul className="space-y-2.5">
                  {upcomingDeadlines.map((c, idx) => (
                    <li
                      key={c.id}
                      className="flex items-start gap-2.5 rounded-lg border border-hairline bg-canvas/40 p-2.5 text-left hover:bg-accent-soft/30 transition-colors cursor-pointer"
                      onClick={() => openCase(c.id)}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning-soft text-[10px] font-bold text-warning">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-ink">{c.name}</p>
                        <p className="text-[10px] text-warning font-medium">{c.deadlineLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-hairline bg-canvas/40 p-3 text-center">
                  <p className="text-[11px] text-ink-muted">Sin plazos próximos</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* Compact "Start by branch" bar */}
        <section className="mt-8 pb-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            <h3 className="font-serif text-sm font-medium text-ink">Iniciar por rama</h3>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {BRANCH_LIST.map((b) => (
              <button
                key={b.id}
                onClick={() => openCaseModal(b.id)}
                title={b.name}
                className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-panel-solid p-2 text-left transition-all hover:border-accent/40 hover:bg-accent-soft/40 active:scale-[0.97] cursor-pointer"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  <BranchIcon id={b.id} size={14} />
                </span>
                <span className="hidden truncate text-[11px] font-medium text-ink lg:inline max-w-[80px]">
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
