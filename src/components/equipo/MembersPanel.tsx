import { useCallback, useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Mail,
  Plus,
  Loader2,
  Copy,
  Check,
  Crown,
  UserRound,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listarMiembros,
  listarInvitaciones,
  crearInvitacion,
  enlaceInvitacion,
  type Miembro,
  type Invitacion,
} from "@/lib/invites";
import { obtenerCodigoColaboracion, generarCodigoColaboracion } from "@/lib/supabase";

function relativoConexion(iso: string | null): string {
  if (!iso) return "Nunca";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Desconocido";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return new Date(t).toLocaleDateString("es-MX", { weekday: "long", hour: "2-digit", minute: "2-digit" });
}

export function MembersPanel() {
  const { perfil, loading } = useAuth();
  const navigate = useNavigate();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [invites, setInvites] = useState<Invitacion[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [m, i] = await Promise.all([listarMiembros(), listarInvitaciones()]);
    setMiembros(m);
    setInvites(i);
  }, []);

  useEffect(() => {
    if (perfil?.organizacion_id) void refresh();
  }, [perfil?.organizacion_id, refresh]);

  useEffect(() => {
    if (perfil?.rol_organizacion === "dueno")
      void obtenerCodigoColaboracion().then(setCodigo);
  }, [perfil?.rol_organizacion]);

  if (loading) return null;
  if (!perfil || perfil.rol_organizacion !== "dueno" || !perfil.organizacion_id) {
    return <Navigate to="/app" replace />;
  }

  const invitar = async () => {
    const v = email.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    const res = await crearInvitacion(perfil.organizacion_id!, v);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEmail("");
    await refresh();
    if (res.token) void copy(enlaceInvitacion(res.token));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? null : c)), 2000);
    } catch { /* noop */ }
  };

  const generar = async () => {
    setGenBusy(true);
    const code = await generarCodigoColaboracion();
    if (code) setCodigo(code);
    setGenBusy(false);
  };

  const pendientes = invites.filter((i) => i.estado === "pendiente");

  return (
    <div className="min-h-dvh bg-canvas px-5 py-8 text-ink">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/app")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={15} />
          Volver a la app
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
            <Users size={22} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-medium leading-tight">Mi Despacho</h1>
            <p className="text-sm text-ink-muted">Gestiona a tu equipo e invita colaboradores.</p>
          </div>
        </div>

        {/* Código de colaboración — Liquid Glass */}
        <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-6 shadow-float backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Código de colaboración
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Comparte este código con abogados externos para que se unan al despacho
                </p>
              </div>
              <button
                onClick={generar}
                disabled={genBusy}
                className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:bg-white/20 hover:text-ink cursor-pointer"
                title="Generar nuevo código"
              >
                <RefreshCw size={12} className={genBusy ? "animate-spin" : ""} />
                {genBusy ? "Generando…" : "Renovar"}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="rounded-2xl border border-white/30 bg-white/5 px-8 py-4 backdrop-blur-sm">
                <span className="font-mono text-3xl font-bold tracking-[0.15em] text-ink">
                  {codigo ?? "PAS-????-MX"}
                </span>
              </div>
              <button
                onClick={() => codigo && copy(codigo)}
                className="ml-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20 cursor-pointer"
                title="Copiar código"
              >
                {copied === codigo ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-ink-muted" />}
              </button>
            </div>
          </div>
        </section>

        {/* Invitar */}
        <section className="mb-6 rounded-2xl border border-hairline bg-panel-solid p-5 shadow-card">
          <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
            Invitar colaborador
          </h2>
          <p className="mb-3 text-[13px] text-ink-muted">
            Genera un enlace de invitación. Al aceptarlo, el abogado se une a tu despacho y verá los
            expedientes compartidos.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invitar()}
                type="email"
                placeholder="correo@colega.mx"
                className="w-full rounded-xl border border-hairline bg-panel-solid pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              />
            </div>
            <button
              onClick={invitar}
              disabled={busy || !email.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 cursor-pointer"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Invitar
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pendientes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {pendientes.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-2.5 rounded-xl border border-hairline bg-canvas/50 px-3 py-2.5"
                >
                  <Clock size={15} className="shrink-0 text-warning" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {inv.email_invitado}
                  </span>
                  <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    Pendiente
                  </span>
                  <button
                    onClick={() => copy(enlaceInvitacion(inv.token))}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-hairline px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
                    title="Copiar enlace de invitación"
                  >
                    {copied === enlaceInvitacion(inv.token) ? (
                      <>
                        <Check size={13} className="text-success" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Enlace
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Miembros */}
        <section className="rounded-2xl border border-hairline bg-panel-solid p-5 shadow-card">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
            Miembros ({miembros.length})
          </h2>
          <ul className="space-y-2">
            {miembros.map((m) => {
              const dueno = m.rol_organizacion === "dueno";
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas/50 px-3 py-2.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      dueno ? "bg-accent text-white" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {dueno ? <Crown size={16} /> : <UserRound size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {m.nombre_completo || "Sin nombre"}
                    </p>
                    <div className="flex items-center gap-2">
                      {m.especialidad && (
                        <p className="truncate text-[11px] text-ink-subtle">{m.especialidad}</p>
                      )}
                      <p className="flex items-center gap-1 text-[10px] text-ink-muted">
                        <Clock size={10} />
                        {relativoConexion(m.ultima_conexion)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {dueno ? "Dueño" : "Invitado"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
