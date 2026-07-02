import { useState } from "react";
import {
  CalendarClock,
  Sparkles,
  AlertTriangle,
  CircleDot,
  Clock,
  FileText,
  Flag,
  RotateCw,
  Inbox,
  Printer,
  X,
  Check,
  CalendarPlus,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import type { TimelineEvent, TimelineInconsistency, TimelineSeverity } from "@/lib/types";
import { exportarReporteCronologia } from "@/lib/export";
import { BRANCHES } from "@/lib/branches";
import { calcularPlazo, PRESETS_PLAZO } from "@/lib/plazos";

/* ──────────────────── Cálculo de Términos Procesales ──────────────────── */

const inputPlazo =
  "rounded-xl border border-hairline bg-panel-solid px-3 py-2 text-[13px] text-ink focus:border-accent focus:outline-none";

function PlazoCalculator({ align = "right" }: { align?: "right" | "center" }) {
  const { addPlazo } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState("");
  const [preset, setPreset] = useState(0); // -1 = personalizado
  const [custom, setCustom] = useState(9);
  const [added, setAdded] = useState(false);

  const dias = preset === -1 ? Math.max(1, custom) : PRESETS_PLAZO[preset].dias;
  const label = preset === -1 ? `Término de ${dias} días hábiles` : PRESETS_PLAZO[preset].label;
  const r = fecha ? calcularPlazo(new Date(`${fecha}T12:00:00`), dias) : null;

  const guardar = () => {
    if (!r) return;
    const notif = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    addPlazo(
      `Vence: ${label}`,
      r.vencimiento.toISOString(),
      `Término procesal de ${dias} días hábiles. Notificado el ${notif}.`,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };
  const tone = !r
    ? ""
    : r.vencido || r.habilesRestantes <= 2
      ? "bg-danger-soft text-danger"
      : r.habilesRestantes <= 5
        ? "bg-warning-soft text-warning"
        : "border border-green-500/20 bg-green-500/5 text-green-700 dark:bg-green-500/10 dark:text-green-400";

  return (
    <div className={align === "center" ? "w-full max-w-md" : ""}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
      >
        <CalendarClock size={13} className="text-accent" />
        Calcular Término Procesal
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-hairline bg-panel-solid/70 p-4 text-left shadow-card backdrop-blur-md animate-scale-in">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-ink">Cómputo de días hábiles (PJF)</p>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
              aria-label="Cerrar calculadora"
            >
              <X size={13} />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-subtle">
              Fecha de notificación
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputPlazo}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-subtle">
              Materia del escrito / término
              <select
                value={preset}
                onChange={(e) => setPreset(Number(e.target.value))}
                className={`${inputPlazo} cursor-pointer`}
              >
                {PRESETS_PLAZO.map((p, i) => (
                  <option key={p.label} value={i}>
                    {p.label}
                  </option>
                ))}
                <option value={-1}>Personalizado (N días hábiles)</option>
              </select>
            </label>
            {preset === -1 && (
              <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-subtle">
                Días hábiles
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={custom}
                  onChange={(e) => setCustom(Number(e.target.value))}
                  className={inputPlazo}
                />
              </label>
            )}
          </div>

          {r && (
            <div className={`mt-3 rounded-xl px-4 py-3 ${tone} animate-fade-in`}>
              <p className="text-xl font-bold leading-tight">
                {r.vencido
                  ? `Vencido hace ${Math.abs(r.habilesRestantes)} días hábiles`
                  : r.habilesRestantes === 0
                    ? "Vence HOY"
                    : `${r.habilesRestantes} días hábiles restantes`}
              </p>
              <p className="mt-0.5 text-[12px] font-medium opacity-80">
                Vence el{" "}
                {r.vencimiento.toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          {r && !r.vencido && (
            <button
              onClick={guardar}
              disabled={added}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-60 cursor-pointer"
            >
              {added ? (
                <>
                  <Check size={14} /> Añadido a la cronología
                </>
              ) : (
                <>
                  <CalendarPlus size={14} /> Añadir a la cronología
                </>
              )}
            </button>
          )}

          <p className="mt-3 text-[10px] leading-relaxed text-ink-subtle">
            Descuenta sábados, domingos, inhábiles oficiales (art. 19 Ley de Amparo · art. 74 LFT)
            y recesos del PJF (16–31 jul, 16–31 dic). El cómputo inicia el día hábil siguiente a la
            notificación — verifica cuándo surte efectos en tu materia. Cálculo conservador.
          </p>
        </div>
      )}
    </div>
  );
}

const DAY = 86400000;
/** Above 7 events the horizontal layout gets cramped, so we switch to vertical. */
const HORIZONTAL_MAX = 7;

const SEVERITY: Record<
  TimelineSeverity,
  {
    dot: string;
    chip: string;
    text: string;
    border: string;
    label: string;
    icon: typeof CircleDot;
  }
> = {
  info: {
    dot: "bg-accent",
    chip: "bg-accent-soft text-accent",
    text: "text-accent",
    border: "border-accent",
    label: "Hecho",
    icon: CircleDot,
  },
  warning: {
    dot: "bg-warning",
    chip: "bg-warning-soft text-warning",
    text: "text-warning",
    border: "border-warning",
    label: "Contradicción",
    icon: AlertTriangle,
  },
  deadline: {
    dot: "bg-danger",
    chip: "bg-danger-soft text-danger",
    text: "text-danger",
    border: "border-danger",
    label: "Plazo",
    icon: Clock,
  },
};

function relDays(iso: string): number | null {
  if (!iso) return null;
  return Math.round((+new Date(iso) - Date.now()) / DAY);
}

function relLabel(d: number): string {
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  return d > 0 ? `en ${d} días` : `hace ${Math.abs(d)} días`;
}

function yearOf(ev: TimelineEvent): string {
  return ev.iso ? new Date(ev.iso).getFullYear().toString() : "Por confirmar";
}

/** Short, uniform date label ("12 mar 2026"); falls back to the raw string. */
function compactDate(ev: TimelineEvent): string {
  if (!ev.iso) return ev.date;
  return new Date(ev.iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="mt-1 h-3 w-3 rounded-full bg-elevated shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-elevated shimmer" />
            <div className="h-3 w-2/3 rounded bg-elevated shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Banner highlighting the nearest upcoming deadline (or the most recent overdue one). */
function NextDeadline({ events }: { events: TimelineEvent[] }) {
  const deadlines = events.filter((e) => e.severity === "deadline" && e.iso);
  if (!deadlines.length) return null;

  const future = deadlines
    .filter((e) => relDays(e.iso)! >= 0)
    .sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
  const overdue = deadlines
    .filter((e) => relDays(e.iso)! < 0)
    .sort((a, b) => +new Date(b.iso) - +new Date(a.iso));
  const ev = future[0] ?? overdue[0];
  const d = relDays(ev.iso)!;

  const tone =
    d < 0 || d <= 7
      ? "bg-danger-soft text-danger"
      : d <= 30
        ? "bg-warning-soft text-warning"
        : "bg-accent-soft text-accent";

  return (
    <div
      className={`mb-5 flex items-center gap-3 rounded-xl px-4 py-3 animate-scale-in ${tone}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-solid">
        <Flag size={17} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          {d < 0 ? "Plazo vencido" : "Próximo plazo"}
        </p>
        <p className="truncate text-sm font-semibold text-ink">{ev.title}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{relLabel(d)}</p>
        <p className="text-[11px] opacity-70">{compactDate(ev)}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────── Vertical layout (many events) ──────────────────────────── */

function EventCard({ ev, index }: { ev: TimelineEvent; index: number }) {
  const s = SEVERITY[ev.severity];
  const Icon = s.icon;
  const d = relDays(ev.iso);
  const imminent = ev.severity === "deadline" && d !== null && d >= 0 && d <= 7;
  const showRel = d !== null && (ev.severity === "deadline" || Math.abs(d) <= 14);

  return (
    <li
      className="relative mb-4 pl-7 animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
    >
      <span
        className={`absolute left-[3px] top-1 h-3.5 w-3.5 rounded-full ${s.dot} ring-4 ring-canvas ${
          imminent ? "animate-pulse" : ""
        }`}
      />
      <div className="rounded-xl border border-hairline bg-panel-solid px-3.5 py-3 shadow-card transition-shadow hover:shadow-float">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink">{compactDate(ev)}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.chip}`}
          >
            <Icon size={11} />
            {s.label}
          </span>
          {showRel && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                d! < 0
                  ? "text-ink-subtle"
                  : ev.severity === "deadline"
                    ? "bg-danger-soft text-danger"
                    : "bg-elevated text-ink-muted"
              }`}
            >
              {relLabel(d!)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm font-medium leading-snug text-ink">{ev.title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{ev.detail}</p>
        {ev.source && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-subtle">
            <FileText size={11} />
            <span className="truncate">{ev.source}</span>
          </p>
        )}
      </div>
    </li>
  );
}

function VerticalTimeline({ events }: { events: TimelineEvent[] }) {
  const now = Date.now();
  const todayStr = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  type Row =
    | { kind: "year"; label: string }
    | { kind: "today" }
    | { kind: "event"; ev: TimelineEvent; i: number };
  const rows: Row[] = [];
  let lastYear = "";
  let todayPlaced = false;
  events.forEach((ev, i) => {
    const year = yearOf(ev);
    if (year !== lastYear) {
      rows.push({ kind: "year", label: year });
      lastYear = year;
    }
    if (!todayPlaced && ev.iso && +new Date(ev.iso) > now) {
      rows.push({ kind: "today" });
      todayPlaced = true;
    }
    rows.push({ kind: "event", ev, i });
  });

  return (
    <div className="relative">
      {/* Vertical rail connecting the events. */}
      <span className="pointer-events-none absolute bottom-1 left-[10px] top-1 w-px bg-ink-subtle" />
      <ol className="relative">
        {rows.map((row, idx) => {
          if (row.kind === "year") {
            return (
              <li key={`y-${row.label}-${idx}`} className="relative mb-3 mt-1 pl-7">
                <span className="absolute left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-hairline bg-canvas" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                  {row.label}
                </span>
              </li>
            );
          }
          if (row.kind === "today") {
            return (
              <li key={`today-${idx}`} className="relative mb-4 pl-7">
                <span className="absolute left-[3px] top-0.5 h-3.5 w-3.5 rounded-full bg-accent ring-4 ring-canvas animate-pulse" />
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Hoy
                  </span>
                  <span className="text-[11px] font-medium text-ink-muted">{todayStr}</span>
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              </li>
            );
          }
          return <EventCard key={row.ev.id} ev={row.ev} index={row.i} />;
        })}
      </ol>
    </div>
  );
}

/* ──────────────────────────── Horizontal layout (few events) ──────────────────────────── */

function HText({ ev, s }: { ev: TimelineEvent; s: (typeof SEVERITY)[TimelineSeverity] }) {
  const Icon = s.icon;
  return (
    <div className="w-[150px] px-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${s.chip}`}
      >
        <Icon size={9} />
        {s.label}
      </span>
      <p className="mt-1 text-[12px] font-semibold leading-snug text-ink">{ev.title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{ev.detail}</p>
      {ev.source && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-subtle">
          <FileText size={9} />
          <span className="truncate">{ev.source}</span>
        </p>
      )}
    </div>
  );
}

function HColumn({ ev, index }: { ev: TimelineEvent; index: number }) {
  const s = SEVERITY[ev.severity];
  const up = index % 2 === 0;
  const d = relDays(ev.iso);
  const imminent = ev.severity === "deadline" && d !== null && d >= 0 && d <= 7;

  const pin = <span className={`h-3 w-3 shrink-0 rounded-full border-2 bg-canvas ${s.border}`} />;
  // A stem that stretches to span the gap between the pin and the central axis.
  const stem = <span className="w-px flex-1 bg-ink-subtle" />;
  const spacer = <div className="flex-1" />;
  const year = (
    <div className="px-1 text-center leading-none">
      <p className={`text-lg font-extrabold ${s.text}`}>{compactDate(ev)}</p>
      {ev.severity === "deadline" && d !== null && (
        <p className="mt-0.5 text-[10px] font-semibold text-ink-subtle">{relLabel(d)}</p>
      )}
    </div>
  );

  return (
    <div
      className="relative flex h-[440px] min-w-[170px] flex-1 flex-col items-center animate-slide-up"
      style={{ animationDelay: `${Math.min(index, 10) * 70}ms` }}
    >
      {/* marker sitting on the central axis */}
      <span
        className={`absolute left-1/2 top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-canvas ${s.dot} ${
          imminent ? "animate-pulse" : ""
        }`}
      />
      {/* TOP half — content hugs the axis at the bottom */}
      <div className="flex h-[220px] w-full flex-col items-center">
        {up ? (
          <>
            <HText ev={ev} s={s} />
            {pin}
            {stem}
          </>
        ) : (
          <>
            {spacer}
            {year}
          </>
        )}
      </div>
      {/* BOTTOM half — content hugs the axis at the top */}
      <div className="flex h-[220px] w-full flex-col items-center">
        {up ? (
          <>
            {year}
            {spacer}
          </>
        ) : (
          <>
            {stem}
            {pin}
            <HText ev={ev} s={s} />
          </>
        )}
      </div>
    </div>
  );
}

function HorizontalTimeline({ events }: { events: TimelineEvent[] }) {
  const now = Date.now();
  const firstFuture = events.findIndex((e) => e.iso && +new Date(e.iso) > now);

  return (
    <div className="scroll-zone overflow-x-auto pb-2">
      <div
        className="relative flex h-[440px]"
        style={{ minWidth: `${events.length * 170}px` }}
      >
        {/* the timeline axis with rounded end caps */}
        <span className="pointer-events-none absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ink-subtle" />
        <span className="pointer-events-none absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-ink-subtle" />
        <span className="pointer-events-none absolute right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-ink-subtle" />

        {/* "Hoy" divider between the last past event and the first upcoming one */}
        {firstFuture > 0 && (
          <div
            className="pointer-events-none absolute bottom-8 top-8 z-10 flex flex-col items-center"
            style={{ left: `${(firstFuture / events.length) * 100}%` }}
          >
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Hoy
            </span>
            <span className="mt-1 w-0 flex-1 border-l border-dashed border-accent" />
          </div>
        )}

        {events.map((ev, i) => (
          <HColumn key={ev.id} ev={ev} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── Inconsistency banner ──────────────────────── */

function InconsistencyBanner({ inconsistencies }: { inconsistencies: TimelineInconsistency[] }) {
  if (!inconsistencies.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {inconsistencies.map((inc) => {
        const isError = inc.severidad === "error";
        return (
          <div
            key={inc.id}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-[13px] leading-snug animate-slide-up ${
              isError
                ? "border-danger/40 bg-danger-soft text-danger"
                : "border-warning/40 bg-warning-soft text-warning"
            }`}
          >
            <span className="mt-0.5 shrink-0">{isError ? "🚫" : "⚠️"}</span>
            <div>
              <p className="font-semibold">
                {inc.tipo === "fechas" ? "Inconsistencia de fechas" : "Posible contradicción"}
              </p>
              <p className="mt-0.5 opacity-80">{inc.descripcion}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────── Entry point ──────────────────────────── */

export function Timeline() {
  const { timeline, timelineLoading, runTimeline, caseName, branch, inconsistencies } = useWorkspace();
  const sortedTimeline = [...(timeline || [])].sort(
    (a, b) => +new Date(a.iso || 0) - +new Date(b.iso || 0)
  );

  if (timelineLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-ink-muted">
          <Sparkles size={16} className="text-accent" />
          Analizando expediente y ordenando hechos…
        </div>
        <Skeleton />
      </div>
    );
  }

  if (!sortedTimeline || sortedTimeline.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <CalendarClock size={26} strokeWidth={1.5} />
        </span>
        <h3 className="text-base font-semibold text-ink">La cronología se construye sola</h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          Cada documento que sueltas en el Archivero aporta sus hechos con fecha. La IA
          los ordena, detecta plazos y marca posibles contradicciones — y la línea del
          tiempo crece automáticamente.
        </p>
        <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-elevated px-4 py-2.5 text-[13px] text-ink-muted">
          <Inbox size={16} className="text-accent" />
          Arrastra un documento para empezar
        </div>
        <button
          onClick={runTimeline}
          className="mt-4 flex items-center gap-2 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <Sparkles size={15} className="text-accent" />
          Ver cronología de referencia
        </button>
        <div className="mt-4 flex flex-col items-center">
          <PlazoCalculator align="center" />
        </div>
      </div>
    );
  }

  const deadlines = sortedTimeline.filter((e) => e.severity === "deadline").length;
  const horizontal = sortedTimeline.length <= HORIZONTAL_MAX;

  return (
    <div className={`mx-auto px-4 py-6 ${horizontal ? "max-w-5xl" : "max-w-2xl"}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarClock size={16} className="text-accent" />
            Cronología del caso
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-subtle">
            {sortedTimeline.length} {sortedTimeline.length === 1 ? "hecho" : "hechos"}
            {deadlines > 0 && ` · ${deadlines} ${deadlines === 1 ? "plazo" : "plazos"}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              exportarReporteCronologia(
                caseName,
                BRANCHES[branch].name,
                sortedTimeline,
                inconsistencies,
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            <Printer size={13} />
            Exportar
          </button>
          <button
            onClick={runTimeline}
            className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            <RotateCw size={13} />
            Regenerar
          </button>
        </div>
      </div>

      <div className="mb-4">
        <PlazoCalculator />
      </div>

      <InconsistencyBanner inconsistencies={inconsistencies} />

      <NextDeadline events={sortedTimeline} />

      {horizontal ? (
        <HorizontalTimeline events={sortedTimeline} />
      ) : (
        <VerticalTimeline events={sortedTimeline} />
      )}
    </div>
  );
}
