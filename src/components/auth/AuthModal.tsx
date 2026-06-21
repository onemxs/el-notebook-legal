import { useState } from "react";
import { LogIn, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { useAuth } from "@/lib/auth";

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
