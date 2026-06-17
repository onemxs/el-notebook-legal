import { useState } from "react";
import { Loader2, Mail, Lock, User, AlertTriangle, MailCheck, LogIn } from "lucide-react";
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

type Mode = "login" | "signup";

const field =
  "w-full rounded-xl border border-hairline bg-panel-solid pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors";

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = isLogin
      ? await signInWithEmail(email.trim(), password)
      : await signUpWithEmail(email.trim(), password, nombre.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (!isLogin && "needsConfirmation" in res && res.needsConfirmation) {
      setConfirmSent(true);
      return;
    }
    // Sesión activa → el router redirige a /app. Cerramos el modal.
    onClose();
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    const res = await signInWithGoogle();
    if (res.error) {
      setError(res.error);
      setBusy(false);
    }
    // En éxito, el navegador redirige a Google; no reseteamos busy.
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<LogIn size={18} />}
      title={isLogin ? "Inicia sesión" : "Crea tu cuenta"}
      subtitle={
        isLogin
          ? "Accede a tus expedientes en PasantIA"
          : "Empieza gratis — un par de datos y listo"
      }
    >
      {confirmSent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <MailCheck size={24} />
          </span>
          <p className="text-sm font-medium text-ink">Revisa tu correo</p>
          <p className="max-w-xs text-[13px] text-ink-muted">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo para activar
            tu cuenta e iniciar sesión.
          </p>
        </div>
      ) : (
        <div className="animate-fade-in">
          <button
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-panel-solid px-4 py-2.5 text-sm font-medium text-ink shadow-card transition-colors hover:bg-elevated disabled:opacity-50 cursor-pointer"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-subtle">
            <span className="h-px flex-1 bg-hairline" />o con tu correo<span className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={submit} className="space-y-2.5">
            {!isLogin && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  className={field}
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                className={field}
                type="email"
                placeholder="correo@despacho.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                className={field}
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-50 cursor-pointer"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {isLogin ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-ink-muted">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setError(null);
              }}
              className="font-semibold text-accent hover:underline cursor-pointer"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      )}
    </Modal>
  );
}
