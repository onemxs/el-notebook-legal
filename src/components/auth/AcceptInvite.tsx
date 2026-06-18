import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Scale, Users, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/auth/AuthModal";

type Status = "idle" | "working" | "error";

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { session, loading, processPendingInvite } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  // Stash the token so it survives the auth round-trip (incl. Google redirect).
  useEffect(() => {
    if (token) {
      try {
        sessionStorage.setItem("pasantia-invite", token);
      } catch {
        /* noop */
      }
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (session) {
      setStatus("working");
      void processPendingInvite().then((res) => {
        if (res.error) {
          setStatus("error");
          setError(res.error);
        } else {
          navigate("/app", { replace: true });
        }
      });
    } else {
      setAuthOpen(true);
    }
  }, [session, loading, processPendingInvite, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-panel-solid p-8 text-center shadow-card">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Scale size={16} />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">PasantIA</span>
        </div>

        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Users size={24} />
        </span>

        {status === "error" ? (
          <>
            <h1 className="mt-4 font-serif text-xl font-medium">No se pudo aceptar la invitación</h1>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-left text-[12px] text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => navigate("/app")}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-elevated cursor-pointer"
            >
              Ir a la app
              <ArrowRight size={16} />
            </button>
          </>
        ) : status === "working" || session ? (
          <>
            <h1 className="mt-4 font-serif text-xl font-medium">Uniéndote al despacho…</h1>
            <Loader2 size={22} className="mx-auto mt-4 animate-spin text-accent" />
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-xl font-medium">Te invitaron a un despacho</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Inicia sesión o crea tu cuenta para unirte al equipo en PasantIA. Heredarás el acceso
              a los expedientes compartidos.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
