import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  Sun,
  Moon,
  Settings,
  FolderPlus,
  ChevronDown,
  Search,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import { SettingsModal } from "@/components/settings/SettingsModal";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { session, perfil, demo, isSuperadmin, signOut, exitDemo } = useAuth();
  const navigate = useNavigate();
  const { view, branch, caseName, goHome, openCaseModal } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [acctOpen, setAcctOpen] = useState(false);
  const displayName = perfil?.nombre_completo || session?.user.email || "";
  const initial = (displayName.trim()[0] || "U").toUpperCase();
  const b = BRANCHES[branch];
  const inWorkspace = view === "workspace";
  const isDashboard = view === "dashboard";

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-3 sm:px-4">
      {/* Brand — doubles as the home button */}
      <button
        onClick={goHome}
        title="Ir al inicio"
        className="group flex items-center gap-2.5 rounded-xl py-1 pr-2 transition-colors hover:bg-elevated cursor-pointer"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white transition-transform group-hover:scale-105">
          <Scale size={18} strokeWidth={1.75} />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-serif text-[19px] font-semibold leading-none tracking-tight text-ink">
            PasantIA
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Inteligencia jurídica · México
          </span>
        </span>
      </button>

      {/* Active case / branch — only meaningful inside a workspace */}
      {inWorkspace && (
        <button
          onClick={() => openCaseModal()}
          title="Cambiar de rama o crear expediente"
          className="ml-1 flex min-w-0 items-center gap-2 rounded-xl border border-hairline bg-panel-solid px-2.5 py-1.5 transition-colors hover:border-accent/40 hover:bg-accent-soft/40 cursor-pointer animate-fade-in"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <BranchIcon id={branch} size={14} />
          </span>
          <span className="hidden min-w-0 text-left md:block">
            <span className="block text-[10px] font-medium uppercase leading-none tracking-wider text-ink-subtle">
              {b.name}
            </span>
            <span className="block max-w-[200px] truncate text-[12px] font-medium leading-tight text-ink">
              {caseName}
            </span>
          </span>
          <ChevronDown size={14} className="shrink-0 text-ink-subtle" />
        </button>
      )}

      {/* Global search bar — visible on dashboard */}
      {isDashboard && (
        <div className="hidden flex-1 max-w-sm mx-3 sm:flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por expediente, cliente o materia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-hairline bg-panel-solid text-[13px] text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => openCaseModal()}
          className="mr-1 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
        >
          <FolderPlus size={15} />
          <span className="hidden sm:inline">Nuevo caso</span>
        </button>
        <button
          onClick={toggle}
          className={iconBtn}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className={iconBtn}
          aria-label="Configuración avanzada"
          title="Configuración"
        >
          <Settings size={18} />
        </button>

        {/* Account / demo control */}
        {demo ? (
          <button
            onClick={() => {
              exitDemo();
              navigate("/");
            }}
            className="ml-1 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white cursor-pointer"
            title="Estás en modo demo — crea una cuenta para guardar tu trabajo"
          >
            Modo demo · Crear cuenta
          </button>
        ) : session ? (
          <div className="relative ml-1">
            <button
              onClick={() => setAcctOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white transition-transform hover:scale-105 cursor-pointer"
              aria-label="Cuenta"
              title={displayName}
            >
              {initial}
            </button>
            {acctOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAcctOpen(false)} />
                <div className="absolute right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-hairline bg-panel-solid shadow-float animate-scale-in">
                  <div className="border-b border-hairline px-3.5 py-2.5">
                    {perfil?.nombre_completo && (
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {perfil.nombre_completo}
                      </p>
                    )}
                    <p className="truncate text-[12px] text-ink-subtle">{session.user.email}</p>
                  </div>
                  {isSuperadmin && (
                    <button
                      onClick={() => {
                        setAcctOpen(false);
                        navigate("/admin");
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer"
                    >
                      <ShieldCheck size={15} className="text-accent" />
                      Panel de admin
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      setAcctOpen(false);
                      await signOut();
                      navigate("/");
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-danger-soft hover:text-danger cursor-pointer"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
