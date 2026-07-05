import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  Building2,
  FolderArchive,
  Loader2,
  AlertTriangle,
  Crown,
  UserRound,
  UserPlus,
  Sparkles,
  Activity,
  ScrollText,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { CuentaDetalle, hace } from "@/components/admin/CuentaDetalle";

interface Cuenta {
  id: string;
  nombre: string;
  email: string | null;
  tipo_plan: "individual" | "despacho";
  rol_organizacion: "dueno" | "invitado" | "ninguno";
  especialidad: string | null;
  suspendida: boolean;
  cuota_ia: number | null;
  created_at: string;
  last_sign_in_at: string | null;
  organizacion: string | null;
  expedientes: number;
  ia_mes: number;
}
interface Auditoria {
  accion: string;
  detalle: Record<string, unknown>;
  created_at: string;
  admin: string;
  objetivo: string;
}
interface Dashboard {
  usuarios: number;
  despachos: number;
  expedientes: number;
  ia_hoy: number;
  ia_mes: number;
  cuentas: Cuenta[];
  auditoria: Auditoria[];
}

const ROL: Record<Cuenta["rol_organizacion"], { label: string; icon: typeof Crown }> = {
  dueno: { label: "Dueño", icon: Crown },
  invitado: { label: "Invitado", icon: UserPlus },
  ninguno: { label: "Independiente", icon: UserRound },
};

const ACCION: Record<string, string> = { actualizar_cuenta: "actualizó la cuenta de" };

function fmtDetalle(detalle: Record<string, unknown>): string {
  return Object.entries(detalle)
    .map(([k, v]) => `${k}: ${v === true ? "sí" : v === false ? "no" : String(v)}`)
    .join(" · ");
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-panel-solid p-5 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <p className="mt-3 font-serif text-3xl font-medium text-ink">{value.toLocaleString()}</p>
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
    </div>
  );
}

export function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const sb = getSupabase();
    if (!sb) {
      setError("Sin conexión al Servidor Seguro.");
      return;
    }
    sb.rpc("admin_dashboard").then(({ data, error }) => {
      if (error) setError(error.message);
      else setData(data as Dashboard);
    });
  }, []);
  useEffect(cargar, [cargar]);

  return (
    <div className="min-h-dvh bg-canvas px-5 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/app")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={15} />
          Volver a la app
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-medium leading-tight">Panel de superadmin</h1>
            <p className="text-sm text-ink-muted">Métricas globales, consumo de IA y control de cuentas.</p>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-20 text-accent">
            <Loader2 size={26} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Metric icon={<Users size={18} />} value={data.usuarios} label="Usuarios" />
              <Metric icon={<Building2 size={18} />} value={data.despachos} label="Despachos" />
              <Metric icon={<FolderArchive size={18} />} value={data.expedientes} label="Expedientes" />
              <Metric icon={<Sparkles size={18} />} value={data.ia_hoy} label="IA hoy" />
              <Metric icon={<Activity size={18} />} value={data.ia_mes} label="IA · 30 días" />
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-panel-solid shadow-card">
              <div className="border-b border-hairline px-5 py-3.5">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
                  Cuentas ({data.cuentas.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-hairline text-[11px] uppercase tracking-wide text-ink-subtle">
                      <th className="px-5 py-2.5 font-medium">Cuenta</th>
                      <th className="px-3 py-2.5 font-medium">Plan</th>
                      <th className="px-3 py-2.5 font-medium">Actividad</th>
                      <th className="px-3 py-2.5 text-right font-medium">IA · 30 d</th>
                      <th className="px-3 py-2.5 text-right font-medium">Exp.</th>
                      <th className="px-5 py-2.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cuentas.map((c) => {
                      const rol = ROL[c.rol_organizacion];
                      const RolIcon = rol.icon;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSel(c.id)}
                          className={`cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-elevated/60 ${
                            c.suspendida ? "opacity-60" : ""
                          }`}
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink">{c.nombre}</p>
                            <p className="text-[11px] text-ink-subtle">
                              {c.email ?? c.organizacion ?? c.especialidad ?? "—"}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                c.tipo_plan === "despacho"
                                  ? "bg-accent-soft text-accent"
                                  : "bg-elevated text-ink-muted"
                              }`}
                            >
                              {c.tipo_plan === "despacho" ? "Despacho" : "Individual"}
                            </span>
                            <p className="mt-1 inline-flex items-center gap-1 pl-0.5 text-[10px] text-ink-subtle">
                              <RolIcon size={11} className="text-accent" />
                              {rol.label}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-ink-muted">{hace(c.last_sign_in_at)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-medium text-ink">{c.ia_mes.toLocaleString()}</span>
                            {c.cuota_ia != null && (
                              <p className="text-[10px] text-ink-subtle">cuota {c.cuota_ia}/h</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-ink">{c.expedientes}</td>
                          <td className="px-5 py-3">
                            {c.suspendida ? (
                              <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                                IA suspendida
                              </span>
                            ) : (
                              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
                                Activa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-panel-solid shadow-card">
              <div className="flex items-center gap-2 border-b border-hairline px-5 py-3.5">
                <ScrollText size={14} className="text-accent" />
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
                  Bitácora de acciones
                </h2>
              </div>
              {data.auditoria.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-ink-subtle">
                  Sin acciones administrativas registradas.
                </p>
              ) : (
                <ul className="divide-y divide-hairline/60">
                  {data.auditoria.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 px-5 py-3 text-[13px]">
                      <span className="font-medium text-ink">{a.admin}</span>
                      <span className="text-ink-muted">{ACCION[a.accion] ?? a.accion}</span>
                      <span className="font-medium text-ink">{a.objetivo}</span>
                      <span className="text-[11px] text-ink-subtle">
                        · {fmtDetalle(a.detalle)} · {hace(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {sel && <CuentaDetalle id={sel} onClose={() => setSel(null)} onChanged={cargar} />}
    </div>
  );
}
