import { CalendarClock, Sparkles, AlertTriangle, CircleDot, Clock } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import type { TimelineSeverity } from "@/lib/types";

const SEVERITY: Record<
  TimelineSeverity,
  { dot: string; ring: string; label: string; icon: typeof CircleDot }
> = {
  info: { dot: "bg-accent", ring: "ring-accent/20", label: "Hecho", icon: CircleDot },
  warning: {
    dot: "bg-warning",
    ring: "ring-warning/20",
    label: "Contradicción",
    icon: AlertTriangle,
  },
  deadline: { dot: "bg-danger", ring: "ring-danger/20", label: "Plazo", icon: Clock },
};

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

export function Timeline() {
  const { timeline, timelineLoading, runTimeline } = useWorkspace();

  if (timelineLoading) {
    return (
      <div className="mx-auto max-w-2xl px-2 py-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-ink-muted">
          <Sparkles size={16} className="text-accent" />
          Analizando expediente y ordenando hechos…
        </div>
        <Skeleton />
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <CalendarClock size={26} strokeWidth={1.5} />
        </span>
        <h3 className="text-base font-semibold text-ink">Automatización de Cronología</h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          La IA analiza los archivos del caso y genera una secuencia ordenada de los
          hechos para detectar contradicciones de fechas y plazos de prescripción.
        </p>
        <button
          onClick={runTimeline}
          className="mt-5 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98] cursor-pointer"
        >
          <Sparkles size={16} />
          Generar línea del tiempo
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-2 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock size={16} className="text-accent" />
          Cronología del caso
        </h3>
        <button
          onClick={runTimeline}
          className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          Regenerar
        </button>
      </div>

      <ol className="relative ml-1.5 border-l border-hairline">
        {timeline.map((ev, i) => {
          const s = SEVERITY[ev.severity];
          const Icon = s.icon;
          return (
            <li
              key={ev.id}
              className="relative mb-5 pl-6 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className={`absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full ${s.dot} ring-4 ${s.ring}`}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">{ev.date}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    ev.severity === "deadline"
                      ? "bg-danger-soft text-danger"
                      : ev.severity === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-accent-soft text-accent"
                  }`}
                >
                  <Icon size={11} />
                  {s.label}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-ink">{ev.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{ev.detail}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
