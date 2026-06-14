import { useState } from "react";
import { FolderOpen, PenLine, Sparkles } from "lucide-react";
import { ThemeProvider } from "@/lib/theme";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { TopBar } from "@/components/TopBar";
import { DashboardView } from "@/components/DashboardView";
import { NewCaseModal } from "@/components/NewCaseModal";
import { IntakeModal } from "@/components/intake/IntakeModal";
import { ArchiveroPanel } from "@/components/panels/ArchiveroPanel";
import { EditorPanel } from "@/components/panels/EditorPanel";
import { AssistantPanel } from "@/components/panels/AssistantPanel";

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

export default function App() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
