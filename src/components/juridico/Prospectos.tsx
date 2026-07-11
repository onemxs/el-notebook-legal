import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  Phone,
  Mail,
  Trash2,
  ChevronRight,
  Coins,
  X,
} from "lucide-react";
import {
  listarProspectos,
  crearProspecto,
  actualizarProspecto,
  borrarProspecto,
  ESTADOS,
  type Prospecto,
  type EstadoProspecto,
  type NuevoProspecto,
} from "@/lib/prospectos";
import { getSupabase } from "@/lib/supabase";

const fmtMXN = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

// Color del encabezado de cada columna del pipeline.
const ESTADO_COLOR: Record<EstadoProspecto, string> = {
  nuevo: "text-ink-muted",
  contactado: "text-accent",
  reunion: "text-accent",
  propuesta: "text-warning",
  ganado: "text-success",
  perdido: "text-ink-subtle",
};

const inputCls =
  "w-full rounded-xl border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

export function Prospectos() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Prospecto[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = () => listarProspectos().then(setItems);
  useEffect(() => {
    if (!getSupabase()) {
      setItems([]); // demo/local
      return;
    }
    cargar();
  }, []);

  const porEstado = useMemo(() => {
    const m = new Map<EstadoProspecto, Prospecto[]>();
    ESTADOS.forEach((e) => m.set(e.id, []));
    for (const p of items ?? []) m.get(p.estado)?.push(p);
    return m;
  }, [items]);

  const totalPipeline = useMemo(
    () =>
      (items ?? [])
        .filter((p) => p.estado !== "ganado" && p.estado !== "perdido")
        .reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0),
    [items],
  );
  const ganado = useMemo(
    () => (items ?? []).filter((p) => p.estado === "ganado").reduce((acc, p) => acc + (p.valor_estimado ?? 0), 0),
    [items],
  );

  const mover = async (p: Prospecto, estado: EstadoProspecto) => {
    setItems((prev) => (prev ?? []).map((x) => (x.id === p.id ? { ...x, estado } : x)));
    await actualizarProspecto(p.id, { estado });
  };
  const eliminar = async (id: string) => {
    setItems((prev) => (prev ?? []).filter((x) => x.id !== id));
    await borrarProspecto(id);
  };
  const agregar = async (data: NuevoProspecto) => {
    const creado = await crearProspecto(data);
    if (creado) setItems((prev) => [creado, ...(prev ?? [])]);
    setModalOpen(false);
  };

  const sinNube = !getSupabase();

  return (
    <div className="min-h-dvh bg-canvas px-5 py-8 text-ink">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/app")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={15} />
          Volver a la app
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
              <UserPlus size={22} />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-medium leading-tight">Prospectos</h1>
              <p className="text-sm text-ink-muted">Capta y da seguimiento a clientes potenciales.</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={sinNube}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover disabled:opacity-40 enabled:cursor-pointer"
          >
            <UserPlus size={14} />
            Nuevo prospecto
          </button>
        </div>

        {items === null ? (
          <div className="flex items-center justify-center py-20 text-accent">
            <Loader2 size={26} className="animate-spin" />
          </div>
        ) : sinNube ? (
          <div className="rounded-2xl border border-dashed border-hairline py-16 text-center text-sm text-ink-subtle">
            El CRM de prospectos se activa al iniciar sesión.
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
                <p className="font-serif text-2xl font-medium text-ink">{(items ?? []).length}</p>
                <p className="text-[12px] uppercase tracking-wide text-ink-subtle">Prospectos</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
                <p className="font-serif text-2xl font-medium text-ink">{fmtMXN(totalPipeline)}</p>
                <p className="text-[12px] uppercase tracking-wide text-ink-subtle">En pipeline</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
                <p className="font-serif text-2xl font-medium text-success">{fmtMXN(ganado)}</p>
                <p className="text-[12px] uppercase tracking-wide text-ink-subtle">Ganado</p>
              </div>
            </div>

            {/* Pipeline kanban */}
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {ESTADOS.map((col) => {
                const lista = porEstado.get(col.id) ?? [];
                return (
                  <div key={col.id} className="rounded-2xl border border-hairline bg-panel-solid/50 p-2.5">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <h2 className={`text-[12px] font-semibold uppercase tracking-wide ${ESTADO_COLOR[col.id]}`}>
                        {col.label}
                      </h2>
                      <span className="text-[11px] text-ink-subtle">{lista.length}</span>
                    </div>
                    <div className="space-y-2">
                      {lista.map((p) => (
                        <ProspectoCard key={p.id} p={p} onMove={mover} onDelete={eliminar} />
                      ))}
                      {lista.length === 0 && (
                        <p className="px-1 py-3 text-center text-[11px] text-ink-subtle">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {modalOpen && <NuevoModal onClose={() => setModalOpen(false)} onSave={agregar} />}
    </div>
  );
}

function ProspectoCard({
  p,
  onMove,
  onDelete,
}: {
  p: Prospecto;
  onMove: (p: Prospecto, e: EstadoProspecto) => void;
  onDelete: (id: string) => void;
}) {
  const idx = ESTADOS.findIndex((e) => e.id === p.estado);
  const siguiente = ESTADOS[idx + 1];
  return (
    <div className="group rounded-xl border border-hairline bg-panel-solid p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.nombre}</p>
        <button
          onClick={() => onDelete(p.id)}
          className="shrink-0 rounded p-0.5 text-ink-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 cursor-pointer"
          aria-label="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {p.asunto && <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{p.asunto}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-subtle">
        {p.telefono && (
          <a href={`tel:${p.telefono}`} className="inline-flex items-center gap-0.5 hover:text-accent">
            <Phone size={10} />
            {p.telefono}
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className="inline-flex items-center gap-0.5 hover:text-accent">
            <Mail size={10} />
            correo
          </a>
        )}
        {p.valor_estimado ? (
          <span className="inline-flex items-center gap-0.5">
            <Coins size={10} />
            {fmtMXN(p.valor_estimado)}
          </span>
        ) : null}
      </div>
      {siguiente && p.estado !== "ganado" && p.estado !== "perdido" && (
        <button
          onClick={() => onMove(p, siguiente.id)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-accent-soft py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent hover:text-white cursor-pointer"
        >
          {siguiente.label}
          <ChevronRight size={11} />
        </button>
      )}
      {p.estado !== "ganado" && p.estado !== "perdido" && (
        <div className="mt-1 flex gap-1">
          <button
            onClick={() => onMove(p, "ganado")}
            className="flex-1 rounded-lg border border-success/30 py-0.5 text-[10px] font-medium text-success hover:bg-success/10 cursor-pointer"
          >
            Ganado
          </button>
          <button
            onClick={() => onMove(p, "perdido")}
            className="flex-1 rounded-lg border border-hairline py-0.5 text-[10px] font-medium text-ink-subtle hover:bg-elevated cursor-pointer"
          >
            Perdido
          </button>
        </div>
      )}
    </div>
  );
}

function NuevoModal({ onClose, onSave }: { onClose: () => void; onSave: (d: NuevoProspecto) => void }) {
  const [f, setF] = useState<NuevoProspecto>({ nombre: "" });
  const set = <K extends keyof NuevoProspecto>(k: K, v: NuevoProspecto[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-hairline bg-panel-solid p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium text-ink">Nuevo prospecto</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-muted hover:bg-elevated cursor-pointer">
            <X size={17} />
          </button>
        </div>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Nombre *" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Teléfono" value={f.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
            <input className={inputCls} placeholder="Correo" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <input className={inputCls} placeholder="Asunto / necesidad" value={f.asunto ?? ""} onChange={(e) => set("asunto", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Fuente (recomendación…)" value={f.fuente ?? ""} onChange={(e) => set("fuente", e.target.value)} />
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="Valor estimado (MXN)"
              value={f.valor_estimado ?? ""}
              onChange={(e) => set("valor_estimado", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <textarea className={`${inputCls} min-h-[70px] resize-y`} placeholder="Notas" value={f.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-muted hover:bg-elevated cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={() => f.nombre.trim() && onSave({ ...f, nombre: f.nombre.trim() })}
            disabled={!f.nombre.trim()}
            className="rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover disabled:opacity-40 enabled:cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
