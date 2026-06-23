import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { Briefcase, FileSearch, FilePlus } from "lucide-react";

const MODULES = [
  { id: "dashboard" as const, label: "Casos Activos", icon: Briefcase },
  { id: "auditoria" as const, label: "Auditoría Contractual", icon: FileSearch },
  { id: "escribania" as const, label: "Notaría Express", icon: FilePlus },
];

export function Sidebar({ isMobileMenuOpen, onClose }: { isMobileMenuOpen: boolean; onClose: () => void }) {
  const { view, setView } = useWorkspace();
  const { session, demo } = useAuth();
  if (!session && !demo) return null;
  const navigate = (id: string) => { setView(id as any); onClose(); };
  const handleConfigClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setView("configuracion");
  };

  return (
    <nav className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-hairline bg-panel-solid/60 backdrop-blur-sm dark:bg-[#111622]/60 dark:backdrop-blur-lg dark:border-white/10 transition-transform duration-300 ${
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
    } md:static md:translate-x-0`}>
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
          <Briefcase size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-serif text-base font-semibold leading-tight text-ink">PasantIA</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">Inteligencia jurídica</p>
        </div>
      </div>

      {/* Top items */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-4">
        {MODULES.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all cursor-pointer ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:bg-elevated hover:text-ink"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom — profile / config */}
      <div className="border-t border-hairline p-2">
        <div
          onClick={handleConfigClick}
          className="mt-auto flex cursor-pointer items-center justify-between rounded-xl border border-white/60 bg-white/40 p-3 shadow-sm transition-all hover:bg-white/80 select-none dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        >
          <div className="pointer-events-none flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#022448] text-sm font-bold text-white dark:bg-accent">
              O
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-[#022448] dark:text-white">Mi Despacho</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Configuración</span>
            </div>
          </div>
          <span className="pointer-events-none text-sm text-gray-400 dark:text-gray-500">⚙️</span>
        </div>
      </div>
    </nav>
  );
}
