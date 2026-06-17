import { useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FolderOpen, PenLine, Sparkles, Loader2 } from "lucide-react";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { TopBar } from "@/components/TopBar";
import { DashboardView } from "@/components/DashboardView";
import { NewCaseModal } from "@/components/NewCaseModal";
import { IntakeModal } from "@/components/intake/IntakeModal";
import { ArchiveroPanel } from "@/components/panels/ArchiveroPanel";
import { EditorPanel } from "@/components/panels/EditorPanel";
import { AssistantPanel } from "@/components/panels/AssistantPanel";
import { Landing } from "@/components/landing/Landing";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { MembersPanel } from "@/components/equipo/MembersPanel";
import { AcceptInvite } from "@/components/auth/AcceptInvite";

type MobilePanel = "archivero" | "editor" | "asistente";

const NAV: { id: MobilePanel; label: string; icon: typeof FolderOpen }[] = [
  { id: "archivero", label: "Archivero", icon: FolderOpen },
  { id: "editor", label: "Despacho", icon: PenLine },
  { id: "asistente", label: "Asistente", icon: Sparkles },
];

function Workspace() {
  const [mobile, setMobile] = useState<MobilePanel>("editor");
  const show = (id: MobilePanel) => (mobile === id ? "flex" : "hidden");

  return (
    <>
      <main className="flex flex-1 overflow-hidden">
        {/* Panel 1 — Archivero (≈20vw) */}
        <div
          className={`${show("archivero")} w-full lg:flex lg:w-[22vw] lg:min-w-[268px] lg:max-w-[360px]`}
        >
          <ArchiveroPanel />
        </div>

        {/* Panel 2 — Despacho Central / Editor (≈50vw) */}
        <div className={`${show("editor")} w-full min-w-0 lg:flex lg:flex-1`}>
          <EditorPanel />
        </div>

        {/* Panel 3 — Asistente de IA (≈30vw) */}
        <div
          className={`${show("asistente")} w-full lg:flex lg:w-[30vw] lg:min-w-[340px] lg:max-w-[480px]`}
        >
          <AssistantPanel />
        </div>
      </main>

      {/* Mobile / tablet panel switcher */}
      <nav className="flex shrink-0 items-stretch border-t border-hairline bg-aside lg:hidden">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = mobile === id;
          return (
            <button
              key={id}
              onClick={() => setMobile(id)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors cursor-pointer ${
                active ? "text-accent" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              {label}
            </button>
          );
        })}
      </nav>
    </>
  );
}

function AppShell() {
  const { view } = useWorkspace();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <TopBar />
      {view === "dashboard" ? (
        <div className="flex-1 overflow-hidden">
          <DashboardView />
        </div>
      ) : (
        <Workspace />
      )}
      <NewCaseModal />
      <IntakeModal />
    </div>
  );
}

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center bg-canvas text-accent">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}

/** Allows access when authenticated OR in "Explorar sin cuenta" demo mode. */
function RequireAccess({ children }: { children: ReactNode }) {
  const { session, demo, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session && !demo) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Authenticated users only (no demo). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Superadmin-only — protects /admin. */
function RequireSuperadmin({ children }: { children: ReactNode }) {
  const { session, perfil, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/" replace />;
  if (perfil?.rol_sistema !== "superadmin") return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Sends authenticated users through onboarding until they complete it. */
function OnboardingGate({ children }: { children: ReactNode }) {
  const { session, perfil, demo } = useAuth();
  if (demo) return <>{children}</>; // el modo demo nunca hace onboarding
  if (session && !perfil) return <Splash />; // perfil cargando
  if (session && perfil && !perfil.onboarding_completo)
    return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Logged-in / demo users skip the landing and go straight to the app. */
function LandingRoute() {
  const { session, demo, loading } = useAuth();
  if (loading) return <Splash />;
  if (session || demo) return <Navigate to="/app" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route
              path="/app"
              element={
                <RequireAccess>
                  <OnboardingGate>
                    <WorkspaceProvider>
                      <AppShell />
                    </WorkspaceProvider>
                  </OnboardingGate>
                </RequireAccess>
              }
            />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireSuperadmin>
                  <AdminPanel />
                </RequireSuperadmin>
              }
            />
            <Route
              path="/equipo"
              element={
                <RequireAuth>
                  <MembersPanel />
                </RequireAuth>
              }
            />
            <Route path="/invitacion/:token" element={<AcceptInvite />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
