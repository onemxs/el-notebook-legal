import { useState } from "react";
import { LogIn, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    setBusy(true);
    const res = await signInWithGoogle();
    if (res.error) {
      setError(res.error);
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<LogIn size={18} />}
      title="Acceso Seguro"
      subtitle="Inicia sesión o crea tu cuenta al instante con tu cuenta institucional o personal"
    >
      <div className="py-4 space-y-4 animate-fade-in">
        <button
          onClick={google}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-panel-solid px-4 py-3 text-sm font-medium text-ink shadow-card transition-colors hover:bg-elevated disabled:opacity-50 cursor-pointer"
        >
          <GoogleIcon />
          {busy ? "Conectando con Google..." : "Continuar con Google"}
        </button>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-center text-[11px] text-ink-subtle leading-relaxed">
          Al continuar, accedes de forma cifrada a tu entorno multi-tenant protegido por Supabase Auth.
        </p>
      </div>
    </Modal>
  );
}
