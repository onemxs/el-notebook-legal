import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { descargarIcs, type EventoIcs } from "@/lib/ics";

interface Plazo {
  id: string;
  iso: string; // yyyy-mm-dd
  titulo: string;
  detalle: string | null;
  caso: string;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const hoyIso = () => new Date().toISOString().slice(0, 10);

export function Agenda() {
  const navigate = useNavigate();
  const [plazos, setPlazos] = useState<Plazo[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setPlazos([]); // modo demo: sin nube no hay agenda cruzada
      return;
    }
    void (async () => {
      const { data, error } = await sb
        .from("timeline_eventos")
        .select("id, titulo, detalle, iso, casos(nombre)")
        .eq("severidad", "deadline")
        .order("iso");
      if (error || !data) {
        setPlazos([]);
        return;
      }
      const out: Plazo[] = [];
      for (const row of data as unknown as {
        id: string; titulo: string; detalle: string | null; iso: string;
        casos: { nombre: string } | { nombre: string }[] | null;
      }[]) {
        if (!/^\d{4}-\d{2}-\d{2}/.test(row.iso ?? "")) continue;
        const rel = Array.isArray(row.casos) ? row.casos[0] : row.casos;
        out.push({
          id: row.id,
          iso: row.iso.slice(0, 10),
          titulo: row.titulo,
          detalle: row.detalle,
          caso: rel?.nombre ?? "Expediente",
        });
      }
      setPlazos(out);
    })();
  }, []);

  const porDia = useMemo(() => {
    const m = new Map<string, Plazo[]>();
    for (const p of plazos ?? []) {
      if (!m.has(p.iso)) m.set(p.iso, []);
      m.get(p.iso)!.push(p);
    }
    return m;
  }, [plazos]);

  const proximos = useMemo(
    () => (plazos ?? []).filter((p) => p.iso >= hoyIso()).slice(0, 12),
    [plazos],
  );

  // Celdas del mes (lunes primero).
  const celdas = useMemo(() => {
    const first = new Date(cursor.anio, cursor.mes, 1);
    const offset = (first.getDay() + 6) % 7;
    const diasMes = new Date(cursor.anio, cursor.mes + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasMes; d++) {
      out.push(
        `${cursor.anio}-${String(cursor.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const mover = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.anio, c.mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });

  const exportar = () => {
    const eventos: EventoIcs[] = proximosTodos().map((p) => ({
      id: p.id,
      iso: p.iso,
      titulo: p.titulo,
      detalle: p.detalle ?? undefined,
      caso: p.caso,
    }));
    descargarIcs(eventos);
  };
  const proximosTodos = () => (plazos ?? []).filter((p) => p.iso >= hoyIso());

  const hoy = hoyIso();

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

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
              <CalendarDays size={22} />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-medium leading-tight">Agenda de plazos</h1>
              <p className="text-sm text-ink-muted">
                Todos los términos de tus expedientes en un calendario.
              </p>
            </div>
          </div>
          <button
            onClick={exportar}
            disabled={!proximos.length}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover disabled:opacity-40 enabled:cursor-pointer"
          >
            <Download size={14} />
            Exportar .ics
          </button>
        </div>

        {plazos === null ? (
          <div className="flex items-center justify-center py-20 text-accent">
            <Loader2 size={26} className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Calendario */}
            <section className="rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => mover(-1)} className="rounded-full p-1.5 text-ink-muted hover:bg-elevated cursor-pointer" aria-label="Mes anterior">
                  <ChevronLeft size={17} />
                </button>
                <p className="font-serif text-lg font-medium capitalize">
                  {MESES[cursor.mes]} {cursor.anio}
                </p>
                <button onClick={() => mover(1)} className="rounded-full p-1.5 text-ink-muted hover:bg-elevated cursor-pointer" aria-label="Mes siguiente">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink-subtle">
                {DIAS.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celdas.map((iso, i) => {
                  const eventos = iso ? porDia.get(iso) ?? [] : [];
                  const esHoy = iso === hoy;
                  const vencido = iso !== null && iso < hoy && eventos.length > 0;
                  return (
                    <div
                      key={i}
                      className={`min-h-[64px] rounded-lg border p-1 text-left ${
                        iso === null
                          ? "border-transparent"
                          : esHoy
                            ? "border-accent bg-accent-soft"
                            : "border-hairline/60 bg-canvas/40"
                      }`}
                    >
                      {iso && (
                        <>
                          <p className={`px-1 text-[11px] font-medium ${esHoy ? "text-accent" : "text-ink-subtle"}`}>
                            {Number(iso.slice(8, 10))}
                          </p>
                          <div className="mt-0.5 space-y-0.5">
                            {eventos.slice(0, 2).map((e) => (
                              <p
                                key={e.id}
                                title={`${e.titulo} — ${e.caso}`}
                                className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                                  vencido ? "bg-elevated text-ink-subtle line-through" : "bg-danger-soft text-danger"
                                }`}
                              >
                                {e.titulo}
                              </p>
                            ))}
                            {eventos.length > 2 && (
                              <p className="px-1 text-[10px] text-ink-subtle">+{eventos.length - 2} más</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Próximos plazos */}
            <section className="rounded-2xl border border-hairline bg-panel-solid shadow-card">
              <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
                <CalendarClock size={14} className="text-accent" />
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
                  Próximos plazos
                </h2>
              </div>
              {proximos.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-subtle">
                  {getSupabase()
                    ? "Sin términos vigentes. Añádelos desde la cronología de cada expediente."
                    : "En modo demo la agenda cruzada se activa al iniciar sesión."}
                </p>
              ) : (
                <ul className="divide-y divide-hairline/60">
                  {proximos.map((p) => {
                    const dias = Math.round(
                      (new Date(`${p.iso}T12:00:00`).getTime() - new Date(`${hoy}T12:00:00`).getTime()) / 86400000,
                    );
                    return (
                      <li key={p.id} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-[13px] font-medium text-ink">{p.titulo}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              dias <= 3 ? "bg-danger-soft text-danger" : dias <= 7 ? "bg-warning-soft text-warning" : "bg-elevated text-ink-muted"
                            }`}
                          >
                            {dias === 0 ? "HOY" : dias === 1 ? "mañana" : `en ${dias} d`}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-ink-subtle">
                          {p.caso} · {new Date(`${p.iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
