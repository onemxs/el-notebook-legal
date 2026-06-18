import { useEffect, useRef, useState, type ReactNode } from "react";
import { Send, Sparkles, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { BACKEND_READY } from "@/lib/ai";
import { SustentoLegal } from "./SustentoLegal";
import type { ChatMessage } from "@/lib/types";

function renderContent(text: string): ReactNode {
  return text.split("\n").map((line, i) => {
    if (line === "") return <span key={i} className="block h-2" />;

    // Detectar si la línea es una viñeta (*, -, •)
    const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ") || line.trim().startsWith("• ");
    const cleanLine = isBullet ? line.trim().replace(/^[\*\-•]\s+/, "") : line;

    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
    const content = parts.map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );

    if (isBullet) {
      return (
        <ul key={i} className="list-disc pl-4 mb-1">
          <li className="text-[13px]">{content}</li>
        </ul>
      );
    }

    return (
      <p key={i} className="mb-1.5 last:mb-0">
        {content}
      </p>
    );
  });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Asistente escribiendo">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-subtle"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex animate-slide-up ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] ${isUser ? "" : "w-full"}`}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-subtle">
            <Sparkles size={12} className="text-accent" />
            Asistente
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isUser
              ? "rounded-br-md bg-accent text-white"
              : "rounded-bl-md border border-hairline bg-panel-solid text-ink"
          }`}
        >
          {m.pending ? <TypingDots /> : renderContent(m.content)}
        </div>
        {!isUser && m.citations && <SustentoLegal citations={m.citations} />}
      </div>
    </div>
  );
}

export function ChatThread() {
  const { messages, thinking, sendMessage } = useWorkspace();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!draft.trim() || thinking) return;
    sendMessage(draft);
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="scroll-zone flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </div>

      <div className="border-t border-hairline px-3 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-hairline bg-panel-solid p-2 transition-colors focus-within:border-accent">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Consulta el caso… (Enter para enviar)"
            aria-label="Consulta libre al asistente"
            className="max-h-[140px] min-h-[24px] flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || thinking}
            aria-label="Enviar consulta"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 enabled:cursor-pointer enabled:active:scale-95"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-ink-subtle">
          <ShieldCheck size={11} className="text-success" />
          {BACKEND_READY
            ? "Conectado al corpus verificado · Temperatura 0.0"
            : "Modo demostración · respuestas con fundamentación estricta · Temp 0.0"}
        </p>
      </div>
    </div>
  );
}
