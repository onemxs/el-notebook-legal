import { useCallback, useEffect, useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  ShieldBan,
  ShieldCheck,
  FolderOpen,
  Archive,
  FileText,
  MessageSquare,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export interface ModeloTokens {
  modelo: string;
  tin: number;
  tout: number;
}

// USD por millón de tokens [entrada, salida] — precios oficiales de Anthropic.
// Actualizar aquí si cambian; el costo se calcula en la UI para no tocar la base.
const PRECIOS_MTOK: [RegExp, [number, number]][] = [
  [/^claude-opus/, [5, 25]],
  [/^claude-sonnet/, [3, 15]],
  [/^claude-haiku/, [1, 5]],
];

/** Costo estimado en USD de un desglose de tokens por modelo. */
export function costoUSD(modelos: ModeloTokens[] | null | undefined): number {
  return (modelos ?? []).reduce((acc, m) => {
    // ponytail: modelo desconocido cotiza a precio Opus (sobreestima, nunca oculta costo)
    const [, [pin, pout]] = PRECIOS_MTOK.find(([re]) => re.test(m.modelo)) ?? [null, [5, 25]];
    return acc + (m.tin / 1e6) * pin + (m.tout / 1e6) * pout;
  }, 0);
}

export function fmtUSD(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

function fmtTok(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} k`;
  return String(n);
}

interface Detalle {
  perfil: {
    id: string;
    nombre: string;
    email: string | null;
    cedula: string | null;
    especialidad: string | null;
    tipo_plan: "individual" | "despacho";
    rol_organizacion: "dueno" | "invitado" | "ninguno";
    suspendida: boolean;
    cuota_ia: number | null;
    onboarding_completo: boolean;
    created_at: string;
    last_sign_in_at: string | null;
    organizacion: string | null;
  } | null;
  casos_activos: number;
  casos_archivados: number;
  documentos: number;
  mensajes: number;
  plazos_activos: number;
  materias: { rama: string; n: number }[];
  ia_serie: { dia: string; n: number }[];
  ia_modelos: ModeloTokens[];
}

/** "hoy", "ayer", "hace 3 d", "hace 2 meses" — actividad relativa. */
export function hace(iso: string | null): string {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses > 1 ? "es" : ""}`;
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-elevated/50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <span className="font-serif text-xl font-medium text-ink">{value.toLocaleString()}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-subtle">{label}</p>
    </div>
  );
}

function Chip({ tone, children }: { tone: "accent" | "muted" | "danger" | "ok"; children: React.ReactNode }) {
  const cls = {
    accent: "bg-accent-soft text-accent",
    muted: "bg-elevated text-ink-muted",
    danger: "bg-danger-soft text-danger",
    ok: "border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
  }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

const ROL = { dueno: "Dueño de despacho", invitado: "Invitado", ninguno: "Independiente" } as const;

export function CuentaDetalle({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cuota, setCuota] = useState("");

  const cargar = useCallback(() => {
    const sb = getSupabase();
    if (!sb) {
      setError("Sin conexión al Servidor Seguro.");
      return;
    }
    sb.rpc("admin_cuenta_detalle", { p_id: id }).then(({ data, error }) => {
      if (error) setError(error.message);
      else {
        const d = data as Detalle;
        setData(d);
        setCuota(d.perfil?.cuota_ia != null ? String(d.perfil.cuota_ia) : "");
      }
    });
  }, [id]);
  useEffect(cargar, [cargar]);

  const aplicar = async (params: Record<string, unknown>) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.rpc("admin_actualizar_cuenta", { p_id: id, ...params });
    setBusy(false);
    if (error) setError(error.message);
    else {
      cargar();
      onChanged();
    }
  };

  const p = data?.perfil;

  // Serie de IA: rellena los 30 días (el RPC solo trae días con uso).
  const dias30 = Array.from({ length: 30 }, (_, i) =>
    new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
  );
  const porDia = new Map((data?.ia_serie ?? []).map((s) => [s.dia, s.n]));
  const maxDia = Math.max(1, ...dias30.map((d) => porDia.get(d) ?? 0));
  const iaMes = (data?.ia_serie ?? []).reduce((acc, s) => acc + s.n, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-hairline bg-panel-solid p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !data || !p ? (
          <div className="flex items-center justify-center py-16 text-accent">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-medium leading-tight text-ink">{p.nombre}</h2>
                <p className="text-[13px] text-ink-muted">{p.email ?? "sin correo"}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Chip tone="accent">{p.tipo_plan === "despacho" ? "Despacho" : "Individual"}</Chip>
              <Chip tone="muted">{ROL[p.rol_organizacion]}</Chip>
              {p.suspendida ? <Chip tone="danger">IA suspendida</Chip> : <Chip tone="ok">Activa</Chip>}
              {!p.onboarding_completo && <Chip tone="muted">Onboarding incompleto</Chip>}
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-ink-subtle">
              Alta {hace(p.created_at)} · Última conexión {hace(p.last_sign_in_at)}
              {p.organizacion ? ` · ${p.organizacion}` : ""}
              {p.especialidad ? ` · ${p.especialidad}` : ""}
              {p.cedula ? ` · Cédula ${p.cedula}` : ""}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat icon={<FolderOpen size={15} />} value={data.casos_activos} label="Casos activos" />
              <Stat icon={<Archive size={15} />} value={data.casos_archivados} label="Archivados" />
              <Stat icon={<FileText size={15} />} value={data.documentos} label="Documentos" />
              <Stat icon={<MessageSquare size={15} />} value={data.mensajes} label="Mensajes de chat" />
              <Stat icon={<CalendarClock size={15} />} value={data.plazos_activos} label="Plazos vigentes" />
              <Stat icon={<Sparkles size={15} />} value={iaMes} label="IA · 30 días" />
            </div>

            {data.materias.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Materias</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.materias.map((m) => (
                    <Chip key={m.rama} tone="muted">
                      {m.rama} × {m.n}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                Uso de IA · últimos 30 días
              </h3>
              {iaMes === 0 ? (
                <p className="mt-2 text-[12px] text-ink-subtle">Sin uso de IA en este periodo.</p>
              ) : (
                <div className="mt-2 flex h-16 items-end gap-[2px]">
                  {dias30.map((d) => {
                    const n = porDia.get(d) ?? 0;
                    return (
                      <div
                        key={d}
                        title={`${d}: ${n}`}
                        className={`flex-1 rounded-sm ${n > 0 ? "bg-accent/70" : "bg-elevated"}`}
                        style={{ height: n > 0 ? `${Math.max(8, (n / maxDia) * 100)}%` : "3px" }}
                      />
                    );
                  })}
                </div>
              )}
              {data.ia_modelos.length > 0 && (
                <div className="mt-3 space-y-1">
                  {data.ia_modelos.map((m) => (
                    <p
                      key={m.modelo}
                      className="flex items-baseline justify-between gap-2 text-[12px] text-ink-muted"
                    >
                      <span className="truncate">{m.modelo}</span>
                      <span className="shrink-0">
                        {fmtTok(m.tin)} in · {fmtTok(m.tout)} out ·{" "}
                        <span className="font-medium text-ink">{fmtUSD(costoUSD([m]))}</span>
                      </span>
                    </p>
                  ))}
                  <p className="flex items-baseline justify-between border-t border-hairline pt-1.5 text-[12px] font-semibold text-ink">
                    <span>Costo estimado · 30 días</span>
                    <span>{fmtUSD(costoUSD(data.ia_modelos))}</span>
                  </p>
                </div>
              )}
            </div>

            <section className="mt-5 rounded-2xl border border-hairline p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Controles</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={p.tipo_plan}
                  disabled={busy}
                  onChange={(e) => aplicar({ p_tipo_plan: e.target.value })}
                  className="rounded-lg border border-hairline bg-panel-solid px-2.5 py-1.5 text-[13px] text-ink cursor-pointer"
                >
                  <option value="individual">Individual</option>
                  <option value="despacho">Despacho</option>
                </select>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={cuota}
                    disabled={busy}
                    onChange={(e) => setCuota(e.target.value)}
                    placeholder="global"
                    className="w-20 rounded-lg border border-hairline bg-panel-solid px-2.5 py-1.5 text-[13px] text-ink"
                  />
                  <button
                    disabled={busy || !cuota}
                    onClick={() => aplicar({ p_cuota_ia: Number(cuota) })}
                    className="rounded-lg bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    Fijar cuota
                  </button>
                  {p.cuota_ia != null && (
                    <button
                      disabled={busy}
                      onClick={() => aplicar({ p_reset_cuota: true })}
                      className="rounded-lg px-2.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-elevated cursor-pointer"
                    >
                      Volver a global
                    </button>
                  )}
                </div>

                <button
                  disabled={busy}
                  onClick={() => {
                    if (p.suspendida) void aplicar({ p_suspendida: false });
                    else if (confirm(`¿Suspender el uso de IA de ${p.nombre}?`)) void aplicar({ p_suspendida: true });
                  }}
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer ${
                    p.suspendida
                      ? "border border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400"
                      : "bg-danger-soft text-danger hover:bg-danger hover:text-white"
                  }`}
                >
                  {p.suspendida ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                  {p.suspendida ? "Reactivar IA" : "Suspender IA"}
                </button>
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-ink-subtle">
                La suspensión bloquea análisis, asistente y generación de documentos. La cuota son llamadas
                de IA por hora (vacío = límite global). Todo queda en la bitácora.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
