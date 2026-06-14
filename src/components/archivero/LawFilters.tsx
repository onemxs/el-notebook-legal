import { useWorkspace } from "@/lib/workspace";
import { BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import { Toggle } from "@/components/ui/Toggle";

export function LawFilters() {
  const { branch, laws, toggleLaw } = useWorkspace();
  const b = BRANCHES[branch];
  const active = laws.filter((l) => l.enabled).length;

  return (
    <section aria-label="Filtro de leyes">
      <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <BranchIcon id={branch} size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
            Rama activa
          </p>
          <p className="truncate text-sm font-semibold text-ink">{b.name}</p>
        </div>
      </div>

      <p className="mb-2 px-0.5 text-xs text-ink-muted">
        {active} de {laws.length} leyes activas en el marco regulatorio.
      </p>

      <ul className="space-y-1.5">
        {laws.map((law) => (
          <li
            key={law.id}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
              law.enabled
                ? "border-hairline bg-panel-solid"
                : "border-transparent bg-canvas/40"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[13px] font-medium ${
                  law.enabled ? "text-ink" : "text-ink-subtle"
                }`}
              >
                {law.shortName}
              </p>
              <p className="truncate text-[11px] text-ink-subtle">{law.name}</p>
            </div>
            <Toggle
              checked={law.enabled}
              onChange={() => toggleLaw(law.id)}
              label={`Activar ${law.name}`}
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
