import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

// Placeholder — métricas globales y tabla de cuentas llegan en el Módulo 4.
export function AdminPanel() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-panel-solid p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck size={24} />
        </span>
        <h1 className="mt-4 font-serif text-2xl font-medium text-ink">Panel de superadmin</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Métricas globales y la tabla de cuentas llegan en el próximo módulo.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-solid px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-elevated cursor-pointer"
        >
          <ArrowLeft size={16} />
          Volver a la app
        </button>
      </div>
    </div>
  );
}
