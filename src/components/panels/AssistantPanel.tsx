import { useState } from "react";
import { Compass, MessagesSquare } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { QuickGuides } from "@/components/assistant/QuickGuides";
import { ChatThread } from "@/components/assistant/ChatThread";

type Tab = "guides" | "chat";

export function AssistantPanel() {
  const { sendMessage } = useWorkspace();
  const [tab, setTab] = useState<Tab>("guides");

  const askGuide = (q: string) => {
    setTab("chat");
    sendMessage(q);
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-hairline bg-aside">
      <header className="px-4 pt-3.5">
        <h1 className="label-caps text-[11px] text-ink-muted">Asistente de IA</h1>
        <p className="mt-1 text-xs text-ink-subtle">Fundamentación estricta · cero alucinaciones</p>
      </header>

      <div className="px-3 pb-2 pt-3">
        <div className="flex items-center gap-1 rounded-xl bg-elevated p-1">
          <button
            onClick={() => setTab("guides")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
              tab === "guides" ? "bg-panel-solid text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Compass size={15} />
            Guías Rápidas
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
              tab === "chat" ? "bg-panel-solid text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <MessagesSquare size={15} />
            Consulta
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden border-t border-hairline">
        {tab === "guides" ? <QuickGuides onAsk={askGuide} /> : <ChatThread />}
      </div>
    </aside>
  );
}
