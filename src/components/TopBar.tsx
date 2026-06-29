import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  FolderPlus,
  ChevronDown,
  Search,
  LogOut,
  ShieldCheck,
  Users,
  Building2,
  Archive,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import { CrearDespachoModal } from "@/components/equipo/CrearDespachoModal";

export function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { theme, toggle } = useTheme();
  const { session, perfil, demo, isSuperadmin, signOut, exitDemo } = useAuth();
  const navigate = useNavigate();
  const { view, branch, caseName, goHome, openCase, openCaseModal, recentCases } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [acctOpen, setAcctOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const displayName = perfil?.nombre_completo || session?.user.email || "";
  const initial = (displayName.trim()[0] || "U").toUpperCase();
  const b = BRANCHES[branch];
  const inWorkspace = view === "workspace";
  const isDashboard = view === "dashboard";

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-3 sm:px-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink md:hidden cursor-pointer"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>
      {/* Back to dashboard */}
      {inWorkspace ? (
        <button
          onClick={goHome}
          className="flex items-center gap-2 rounded-xl p-2 text-[#022448] transition-all hover:bg-gray-100 dark:text-white dark:hover:bg-white/10 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Volver al Inicio</span>
        </button>
      ) : (
        <div className="w-9" /> /* spacer to keep alignment */
      )}

      {/* Active case / branch — only meaningful inside a workspace */}
      {inWorkspace && (
        <>
          <div className="relative">
            <button
              onClick={() => setRecentOpen((v) => !v)}
              title="Cambiar de expediente"
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
            {recentOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRecentOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-xl border border-hairline bg-panel-solid shadow-float animate-scale-in">
                  <div className="border-b border-hairline px-3.5 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                      Expedientes recientes
                    </p>
                  </div>
                  {recentCases.length === 0 ? (
                    <div className="px-3.5 py-4 text-center text-[12px] text-ink-muted">
                      Ningún expediente abierto aún
                    </div>
                  ) : (
                    recentCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setRecentOpen(false);
                          openCase(c.id);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated text-accent">
                          <BranchIcon id={c.branch} size={12} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="shrink-0 text-[10px] text-ink-subtle">{c.updated}</span>
                      </button>
                    ))
                  )}
                  <div className="border-t border-hairline">
                    <button
                      onClick={() => {
                        setRecentOpen(false);
                        goHome();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink-muted transition-colors hover:bg-accent-soft cursor-pointer"
                    >
                      <Archive size={14} />
                      Todos los expedientes
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
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
                  {perfil && !perfil.organizacion_id && (
                    <button
                      onClick={() => {
                        setAcctOpen(false);
                        setUpgradeOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer"
                    >
                      <Building2 size={15} className="text-accent" />
                      Crear despacho
                    </button>
                  )}
                  {perfil?.rol_organizacion === "dueno" && (
                    <button
                      onClick={() => {
                        setAcctOpen(false);
                        navigate("/equipo");
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft cursor-pointer"
                    >
                      <Users size={15} className="text-accent" />
                      Mi despacho
                    </button>
                  )}
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

      <CrearDespachoModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </header>
  );
}
