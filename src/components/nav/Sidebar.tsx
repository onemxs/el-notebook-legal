import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { Scale, FileSearch, ScrollText, Settings } from "lucide-react";

const MODULES = [
  { id: "dashboard" as const, label: "Expedientes", icon: Scale },
  { id: "auditoria" as const, label: "Auditoría", icon: FileSearch },
  { id: "escribania" as const, label: "Escribanía", icon: ScrollText },
  { id: "configuracion" as const, label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const { view, setView } = useWorkspace();
  const { session, demo } = useAuth();
  if (!session && !demo) return null;

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-hairline bg-aside py-3">
      {MODULES.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            title={label}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
              active
                ? "bg-accent text-white shadow-tactile"
                : "text-ink-muted hover:bg-elevated hover:text-ink"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
          </button>
        );
      })}
    </nav>
  );
}
