import { useEffect, useState } from "react";
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
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface Cuenta {
  id: string;
  nombre: string;
  tipo_plan: "individual" | "despacho";
  rol_organizacion: "dueno" | "invitado" | "ninguno";
  especialidad: string | null;
  organizacion: string | null;
  expedientes: number;
}
interface Dashboard {
  usuarios: number;
  despachos: number;
  expedientes: number;
  cuentas: Cuenta[];
}

const ROL: Record<Cuenta["rol_organizacion"], { label: string; icon: typeof Crown }> = {
  dueno: { label: "Dueño", icon: Crown },
  invitado: { label: "Invitado", icon: UserPlus },
  ninguno: { label: "Independiente", icon: UserRound },
};

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
      <p className="mt-3 font-serif text-3xl font-medium text-ink">{value}</p>
      <p className="text-[12px] uppercase tracking-wide text-ink-subtle">{label}</p>
    </div>
  );
}

export function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setError("Sin conexión a Supabase.");
      return;
    }
    sb.rpc("admin_dashboard").then(({ data, error }) => {
      if (error) setError(error.message);
      else setData(data as Dashboard);
    });
  }, []);

  return (
    <div className="min-h-dvh bg-canvas px-5 py-8 text-ink">
      <div className="mx-auto max-w-4xl">
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
            <p className="text-sm text-ink-muted">Métricas globales y cuentas del sistema.</p>
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric icon={<Users size={18} />} value={data.usuarios} label="Usuarios totales" />
              <Metric icon={<Building2 size={18} />} value={data.despachos} label="Despachos activos" />
              <Metric
                icon={<FolderArchive size={18} />}
                value={data.expedientes}
                label="Expedientes en el sistema"
              />
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
                      <th className="px-3 py-2.5 font-medium">Rol</th>
                      <th className="px-5 py-2.5 text-right font-medium">Expedientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cuentas.map((c) => {
                      const rol = ROL[c.rol_organizacion];
                      const RolIcon = rol.icon;
                      return (
                        <tr key={c.id} className="border-b border-hairline/60 last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink">{c.nombre}</p>
                            <p className="text-[11px] text-ink-subtle">
                              {c.organizacion ? c.organizacion : c.especialidad || "—"}
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
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 text-ink-muted">
                              <RolIcon size={14} className="text-accent" />
                              {rol.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-ink">
                            {c.expedientes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
