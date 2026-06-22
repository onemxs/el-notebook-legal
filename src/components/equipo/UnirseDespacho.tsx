import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { unirsePorCodigo } from "@/lib/supabase";

export function UnirseDespacho() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!session) {
    navigate("/");
    return null;
  }

  const join = async () => {
    const v = codigo.trim().toUpperCase();
    if (!v) return;
    setBusy(true);
    setResult(null);
    const res = await unirsePorCodigo(v);
    setBusy(false);
    if (res.error) {
      setResult({ ok: false, msg: res.error });
    } else {
      setResult({ ok: true, msg: `Te has unido a "${res.firmName ?? "el despacho"}". Redirigiendo…` });
      setTimeout(() => navigate("/app"), 1500);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/app")}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={15} />
          Volver
        </button>

        <div className="rounded-2xl border border-hairline bg-panel-solid p-6 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <Building2 size={20} />
            </span>
            <div>
              <h1 className="font-serif text-xl font-medium leading-tight text-ink">Unirse a un despacho</h1>
              <p className="text-sm text-ink-muted">Ingresa el código que te compartió el dueño</p>
            </div>
          </div>

          <div className="relative">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="PAS-XXXX-MX"
              className="w-full rounded-xl border border-hairline bg-panel-solid px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.15em] text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none uppercase"
              maxLength={12}
              autoFocus
            />
          </div>

          <button
            onClick={join}
            disabled={busy || codigo.trim().length < 10}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 cursor-pointer"
          >
            {busy ? (
              <><Loader2 size={16} className="animate-spin" /> Uniendo…</>
            ) : (
              "Unirse al despacho"
            )}
          </button>

          {result && (
            <div className={`mt-4 flex items-start gap-2.5 rounded-xl p-3 text-[13px] ${
              result.ok ? "bg-success/10 text-success" : "bg-danger-soft text-danger"
            }`}>
              {result.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
              <span>{result.msg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
