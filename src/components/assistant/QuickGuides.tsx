import { HelpCircle, ArrowUpRight, ListChecks } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";

export function QuickGuides({ onAsk }: { onAsk: (q: string) => void }) {
  const { branch } = useWorkspace();
  const b = BRANCHES[branch];

  return (
    <div className="scroll-zone flex-1 overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas/50 p-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <BranchIcon id={branch} size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Guías Rápidas · {b.name}</p>
          <p className="text-xs leading-relaxed text-ink-muted">
            Preguntas críticas que conviene resolver en esta materia. Toca una para
            consultarla con el asistente.
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <ListChecks size={13} className="text-ink-muted" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Checklist del caso
        </span>
      </div>

      <ul className="space-y-2">
        {b.guideQuestions.map((q, i) => (
          <li key={i}>
            <button
              onClick={() => onAsk(q)}
              className="group flex w-full items-start gap-2.5 rounded-xl border border-hairline bg-panel-solid p-3 text-left transition-all hover:border-accent/40 hover:bg-accent-soft/40 hover:shadow-sm active:scale-[0.99] cursor-pointer animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <HelpCircle
                size={16}
                className="mt-0.5 shrink-0 text-accent"
                strokeWidth={1.75}
              />
              <span className="flex-1 text-[13px] leading-relaxed text-ink">{q}</span>
              <ArrowUpRight
                size={15}
                className="mt-0.5 shrink-0 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
