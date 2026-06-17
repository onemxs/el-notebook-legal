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

export function MembersPanel() {
  const { perfil, loading } = useAuth();
  const navigate = useNavigate();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [invites, setInvites] = useState<Invitacion[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [m, i] = await Promise.all([listarMiembros(), listarInvitaciones()]);
    setMiembros(m);
    setInvites(i);
  }, []);

  useEffect(() => {
    if (perfil?.organizacion_id) void refresh();
  }, [perfil?.organizacion_id, refresh]);

  if (loading) return null;
  // Solo el dueño de un despacho gestiona miembros.
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

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      setTimeout(() => setCopied((c) => (c === link ? null : c)), 2000);
    } catch {
      /* clipboard unavailable */
    }
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
                    {m.especialidad && (
                      <p className="truncate text-[11px] text-ink-subtle">{m.especialidad}</p>
                    )}
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
