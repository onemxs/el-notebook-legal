import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

// Placeholder — el flujo de 3 pasos llega en el Módulo 3.
export function Onboarding() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-panel-solid p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Sparkles size={24} />
        </span>
        <h1 className="mt-4 font-serif text-2xl font-medium text-ink">Configuremos tu cuenta</h1>
        <p className="mt-2 text-sm text-ink-muted">
          El onboarding (tipo de cuenta, identidad y apariencia) llega en el próximo módulo.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
        >
          Ir a la app
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
