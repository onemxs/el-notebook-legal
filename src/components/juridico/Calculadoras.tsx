import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, HandCoins, Percent, Coins, Info } from "lucide-react";
import {
  calcularLiquidacion,
  calcularInteres,
  umaAPesos,
  pesosAUma,
  fmtMXN,
  UMA_ANIOS,
  UMA_DIARIA,
  type EntradaLiquidacion,
} from "@/lib/calculos";

type Tab = "liquidacion" | "intereses" | "uma";

const TABS: { id: Tab; label: string; icon: typeof HandCoins }[] = [
  { id: "liquidacion", label: "Liquidación laboral", icon: HandCoins },
  { id: "intereses", label: "Intereses moratorios", icon: Percent },
  { id: "uma", label: "UMA ↔ Pesos", icon: Coins },
];

const inputCls =
  "w-full rounded-xl border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";
const labelCls = "mb-1 block text-[12px] font-medium text-ink-muted";

function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-elevated/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-subtle">
      <Info size={13} className="mt-0.5 shrink-0 text-accent" />
      <span>{children}</span>
    </p>
  );
}

function Liquidacion() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<EntradaLiquidacion>({
    salarioDiario: 0,
    fechaIngreso: "",
    fechaSalida: hoy,
    tipo: "despido",
    incluirVeinteDias: false,
    diasAguinaldo: 15,
    primaVacacionalPct: 25,
    zonaFrontera: false,
  });
  const set = <K extends keyof EntradaLiquidacion>(k: K, v: EntradaLiquidacion[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const res = useMemo(() => calcularLiquidacion(f), [f]);

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3 rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
        <div>
          <label className={labelCls}>Salario diario (cuota diaria, MXN)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={f.salarioDiario || ""}
            onChange={(e) => set("salarioDiario", Number(e.target.value))}
            placeholder="p. ej. 750"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Fecha de ingreso</label>
            <input type="date" className={inputCls} value={f.fechaIngreso} onChange={(e) => set("fechaIngreso", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fecha de salida</label>
            <input type="date" className={inputCls} value={f.fechaSalida} onChange={(e) => set("fechaSalida", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Motivo de terminación</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(["despido", "renuncia"] as const).map((t) => (
              <button
                key={t}
                onClick={() => set("tipo", t)}
                className={`rounded-lg border px-2.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                  f.tipo === t
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-hairline text-ink-muted hover:border-accent/40"
                }`}
              >
                {t === "despido" ? "Despido injustificado" : "Renuncia"}
              </button>
            ))}
          </div>
        </div>
        {f.tipo === "despido" && (
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={f.incluirVeinteDias}
              onChange={(e) => set("incluirVeinteDias", e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Incluir 20 días por año (art. 50-II LFT)
          </label>
        )}
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={f.zonaFrontera}
            onChange={(e) => set("zonaFrontera", e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Zona Libre de la Frontera Norte
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Días de aguinaldo</label>
            <input type="number" min={15} className={inputCls} value={f.diasAguinaldo} onChange={(e) => set("diasAguinaldo", Number(e.target.value) || 15)} />
          </div>
          <div>
            <label className={labelCls}>Prima vacacional %</label>
            <input type="number" min={25} className={inputCls} value={f.primaVacacionalPct} onChange={(e) => set("primaVacacionalPct", Number(e.target.value) || 25)} />
          </div>
        </div>
      </div>

      <div>
        {!res ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-ink-subtle">
            Captura salario y fechas para calcular
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-panel-solid shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-5 py-3.5">
              <p className="text-[13px] text-ink-muted">
                Antigüedad <b className="text-ink">{res.aniosServicio} años</b> · SDI{" "}
                <b className="text-ink">{fmtMXN(res.salarioDiarioIntegrado)}</b>
              </p>
              <p className="font-serif text-2xl font-medium text-ink">{fmtMXN(res.total)}</p>
            </div>
            <table className="w-full text-left text-[13px]">
              <tbody>
                {res.conceptos.map((c, i) => (
                  <tr key={i} className="border-b border-hairline/60 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="text-ink">{c.concepto}</p>
                      <p className="text-[11px] text-ink-subtle">{c.fundamento}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {c.dias != null ? `${c.dias} días` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-ink">{fmtMXN(c.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Nota>
          Cálculo <b>bruto</b> conforme a LFT (arts. 48, 50, 76, 79-80, 87, 162 y 486; tope de prima
          de antigüedad con salario mínimo 2026). No incluye salarios caídos, ISR ni prestaciones
          contractuales superiores — el cómputo definitivo es responsabilidad del abogado.
        </Nota>
      </div>
    </div>
  );
}

function Intereses() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [capital, setCapital] = useState(0);
  const [tasa, setTasa] = useState(6);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState(hoy);

  const res = useMemo(
    () => calcularInteres(capital, tasa, desde, hasta),
    [capital, tasa, desde, hasta],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3 rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
        <div>
          <label className={labelCls}>Capital (MXN)</label>
          <input type="number" min={1} className={inputCls} value={capital || ""} onChange={(e) => setCapital(Number(e.target.value))} placeholder="p. ej. 250000" />
        </div>
        <div>
          <label className={labelCls}>Tasa anual</label>
          <div className="mb-1.5 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setTasa(6)}
              className={`rounded-lg border px-2 py-1.5 text-[12px] font-medium cursor-pointer ${tasa === 6 ? "border-accent bg-accent-soft text-accent" : "border-hairline text-ink-muted"}`}
            >
              6% legal mercantil
            </button>
            <button
              onClick={() => setTasa(9)}
              className={`rounded-lg border px-2 py-1.5 text-[12px] font-medium cursor-pointer ${tasa === 9 ? "border-accent bg-accent-soft text-accent" : "border-hairline text-ink-muted"}`}
            >
              9% legal civil
            </button>
          </div>
          <input type="number" min={0} step={0.5} className={inputCls} value={tasa} onChange={(e) => setTasa(Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Mora desde</label>
            <input type="date" className={inputCls} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" className={inputCls} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        {!res ? (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-ink-subtle">
            Captura capital, tasa y periodo de mora
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { l: "Días de mora", v: String(res.dias) },
              { l: `Interés (${tasa}% anual)`, v: fmtMXN(res.interes) },
              { l: "Capital + interés", v: fmtMXN(res.total) },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-hairline bg-panel-solid p-5 shadow-card">
                <p className="font-serif text-2xl font-medium text-ink">{x.v}</p>
                <p className="mt-1 text-[12px] uppercase tracking-wide text-ink-subtle">{x.l}</p>
              </div>
            ))}
          </div>
        )}
        <Nota>
          Interés <b>simple</b> sobre días naturales (base 365). Tasas legales: 6% anual mercantil
          (art. 362 Cód. Comercio) y 9% anual civil federal (art. 2395 CCF). Si el contrato pacta
          tasa o capitalización distinta, ajústala arriba.
        </Nota>
      </div>
    </div>
  );
}

function Uma() {
  const [cantidad, setCantidad] = useState(1);
  const [anio, setAnio] = useState(UMA_ANIOS[0]);
  const [unidad, setUnidad] = useState<"diaria" | "mensual" | "anual">("diaria");
  const [modo, setModo] = useState<"uma→mxn" | "mxn→uma">("uma→mxn");

  const resultado =
    modo === "uma→mxn" ? umaAPesos(cantidad, anio, unidad) : pesosAUma(cantidad, anio);

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3 rounded-2xl border border-hairline bg-panel-solid p-4 shadow-card">
        <div className="grid grid-cols-2 gap-1.5">
          {(["uma→mxn", "mxn→uma"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`rounded-lg border px-2 py-2 text-[13px] font-medium cursor-pointer ${modo === m ? "border-accent bg-accent-soft text-accent" : "border-hairline text-ink-muted"}`}
            >
              {m === "uma→mxn" ? "UMA → Pesos" : "Pesos → UMA"}
            </button>
          ))}
        </div>
        <div>
          <label className={labelCls}>{modo === "uma→mxn" ? "Cantidad de UMA" : "Importe en pesos"}</label>
          <input type="number" min={0} className={inputCls} value={cantidad || ""} onChange={(e) => setCantidad(Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Año</label>
            <select className={inputCls} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {UMA_ANIOS.map((a) => (
                <option key={a} value={a}>{a} — ${UMA_DIARIA[a]}</option>
              ))}
            </select>
          </div>
          {modo === "uma→mxn" && (
            <div>
              <label className={labelCls}>Unidad</label>
              <select className={inputCls} value={unidad} onChange={(e) => setUnidad(e.target.value as typeof unidad)}>
                <option value="diaria">UMA diaria</option>
                <option value="mensual">UMA mensual</option>
                <option value="anual">UMA anual</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="rounded-2xl border border-hairline bg-panel-solid p-6 text-center shadow-card">
          <p className="text-[12px] uppercase tracking-wide text-ink-subtle">
            {modo === "uma→mxn" ? `${cantidad || 0} UMA ${unidad} (${anio})` : `${fmtMXN(cantidad || 0)} en UMA diaria (${anio})`}
          </p>
          <p className="mt-2 font-serif text-4xl font-medium text-ink">
            {isNaN(resultado) ? "—" : modo === "uma→mxn" ? fmtMXN(resultado) : `${resultado.toLocaleString("es-MX")} UMA`}
          </p>
        </div>
        <Nota>
          UMA {UMA_ANIOS[0]}: ${UMA_DIARIA[UMA_ANIOS[0]]} diaria (INEGI/DOF, vigente desde el 1 de
          febrero). La mensual es la diaria × 30.4 y la anual × 12. Úsala para multas, topes,
          garantías y pensiones fijadas en UMA.
        </Nota>
      </div>
    </div>
  );
}

export function Calculadoras() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("liquidacion");

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
            <Calculator size={22} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-medium leading-tight">Calculadoras jurídicas</h1>
            <p className="text-sm text-ink-muted">
              Liquidación laboral, intereses moratorios y UMA — con fundamento legal.
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                  tab === t.id
                    ? "border-accent bg-accent text-white"
                    : "border-hairline bg-panel-solid text-ink-muted hover:border-accent/40"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "liquidacion" && <Liquidacion />}
        {tab === "intereses" && <Intereses />}
        {tab === "uma" && <Uma />}
      </div>
    </div>
  );
}
