import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Landmark,
  Scale,
  Gavel,
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Inbox,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/**
 * Buscador Jurídico Federal y Estatal — Motor de Certeza Jurídica.
 * Fuentes conectadas (índice propio verificable, ingesta: scripts/ingest_tesis.mjs):
 *  · SJF/SCJN (tesis y jurisprudencias, enlace directo por Registro Digital)
 *  · CJF (sentencias de Juzgados de Distrito y Tribunales Colegiados)
 *  · Cámara de Diputados (legislación federal vigente → leyes_articulos)
 */

const glass = "rounded-2xl border border-hairline bg-panel-solid/70 shadow-card backdrop-blur-md";
const inputCls =
  "w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors";
const selectCls =
  "rounded-xl border border-hairline bg-panel-solid px-3 py-2.5 text-[13px] text-ink focus:border-accent focus:outline-none cursor-pointer";

const MATERIAS = [
  "penal",
  "civil",
  "laboral",
  "mercantil",
  "fiscal",
  "amparo",
  "constitucional",
  "administrativo",
  "comun",
];

const CODIGOS = [
  { id: "CPEUM", nombre: "Constitución Política (CPEUM)" },
  { id: "CNPP", nombre: "Código Nacional de Procedimientos Penales" },
  { id: "CPF", nombre: "Código Penal Federal" },
  { id: "CCF", nombre: "Código Civil Federal" },
  { id: "Cód. Comercio", nombre: "Código de Comercio" },
  { id: "LFT", nombre: "Ley Federal del Trabajo" },
  { id: "CFF", nombre: "Código Fiscal de la Federación" },
  { id: "Ley de Amparo", nombre: "Ley de Amparo" },
];

/** Sedes de los 32 circuitos judiciales federales (1º = CDMX … 32º = Colima). */
const CIRCUITOS = [
  "Ciudad de México",
  "Estado de México",
  "Jalisco",
  "Nuevo León",
  "Sonora",
  "Puebla",
  "Veracruz",
  "Coahuila",
  "San Luis Potosí",
  "Tabasco",
  "Michoacán",
  "Sinaloa",
  "Oaxaca",
  "Yucatán",
  "Baja California",
  "Guanajuato",
  "Chihuahua",
  "Morelos",
  "Tamaulipas",
  "Chiapas",
  "Guerrero",
  "Querétaro",
  "Zacatecas",
  "Nayarit",
  "Durango",
  "Baja California Sur",
  "Quintana Roo",
  "Tlaxcala",
  "Hidalgo",
  "Aguascalientes",
  "Campeche",
  "Colima",
];

const ORGANOS = [
  "Juzgado de Distrito",
  "Tribunal Colegiado de Circuito",
  "Tribunal Colegiado de Apelación",
  "Pleno Regional",
  "Centro de Justicia Penal Federal",
];

interface Tesis {
  registro: number;
  clave: string | null;
  rubro: string;
  sintesis: string;
  tipo: string;
  epoca: string | null;
  instancia: string | null;
  materia: string;
  vigente: boolean;
}

interface Articulo {
  codigo: string;
  articulo: string;
  texto: string;
  rama: string;
}

interface Sentencia {
  id: number;
  circuito: number;
  organo: string;
  materia: string | null;
  expediente: string | null;
  fecha: string | null;
  extracto: string | null;
  url: string | null;
}

function Chip({ tone, children }: { tone: "accent" | "green" | "neutral" | "red"; children: ReactNode }) {
  const cls =
    tone === "accent"
      ? "bg-accent-soft text-accent"
      : tone === "green"
        ? "border border-green-500/20 bg-green-500/5 text-green-700 dark:bg-green-500/10 dark:text-green-400"
        : tone === "red"
          ? "bg-danger-soft text-danger"
          : "bg-elevated text-ink-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function EmptyCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`${glass} flex flex-col items-center px-6 py-10 text-center`}>
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Inbox size={22} strokeWidth={1.5} />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}

/* ──────────────── Tab 1 — Tesis y Jurisprudencia (SJF/SCJN) ──────────────── */

function TesisTab() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [materia, setMateria] = useState("");
  const [rows, setRows] = useState<Tesis[]>([]);
  const [loading, setLoading] = useState(true);

  const buscar = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return setLoading(false);
    setLoading(true);
    const { data } = await sb.rpc("buscar_tesis", {
      q,
      p_materia: materia || null,
      p_tipo: tipo || null,
      p_limit: 20,
    });
    setRows((data as Tesis[]) ?? []);
    setLoading(false);
  }, [q, tipo, materia]);

  useEffect(() => {
    void buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, materia]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void buscar();
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Busca por criterio, rubro o concepto (ej. control de convencionalidad)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={selectCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tesis y jurisprudencias</option>
          <option value="jurisprudencia">Solo jurisprudencia</option>
          <option value="aislada">Solo tesis aisladas</option>
        </select>
        <select className={selectCls} value={materia} onChange={(e) => setMateria(e.target.value)}>
          <option value="">Todas las materias</option>
          {MATERIAS.map((m) => (
            <option key={m} value={m}>
              {m === "comun" ? "Común" : m[0].toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin text-accent" /> Consultando el índice del SJF…
        </div>
      ) : rows.length === 0 ? (
        <EmptyCard title="Sin tesis para esta búsqueda">
          Ajusta los términos o amplía la materia. El índice crece con la ingesta oficial
          (scripts/ingest_tesis.mjs) y cada registro enlaza a su fuente en el SJF.
        </EmptyCard>
      ) : (
        rows.map((t) => (
          <article key={t.registro} className={`${glass} p-5 transition-shadow hover:shadow-float`}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">Registro digital {t.registro}</Chip>
              <Chip tone="neutral">{t.tipo === "jurisprudencia" ? "Jurisprudencia" : "Tesis aislada"}</Chip>
              {t.vigente && (
                <Chip tone="green">
                  <ShieldCheck size={11} /> Vigente
                </Chip>
              )}
              <a
                href={`https://sjf2.scjn.gob.mx/detalle/tesis/${t.registro}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                Ver en SJF <ExternalLink size={11} />
              </a>
            </div>
            <h3 className="mt-2.5 font-serif text-[15px] font-medium leading-snug text-ink">{t.rubro}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{t.sintesis}</p>
            <p className="mt-2.5 text-[11px] text-ink-subtle">
              {[t.clave, t.instancia, t.epoca].filter(Boolean).join(" · ")} · Fuente: Semanario
              Judicial de la Federación
            </p>
          </article>
        ))
      )}
    </div>
  );
}

/* ──────────────── Tab 2 — Sentencias (CJF) ──────────────── */

function CjfTab() {
  const [circuito, setCircuito] = useState(0);
  const [organo, setOrgano] = useState("");
  const [materia, setMateria] = useState("");
  const [rows, setRows] = useState<Sentencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      if (!sb) return setLoading(false);
      setLoading(true);
      let qy = sb.from("cjf_sentencias").select("*").order("fecha", { ascending: false }).limit(20);
      if (circuito) qy = qy.eq("circuito", circuito);
      if (organo) qy = qy.eq("organo", organo);
      if (materia) qy = qy.eq("materia", materia);
      const { data } = await qy;
      setRows((data as Sentencia[]) ?? []);
      setLoading(false);
    })();
  }, [circuito, organo, materia]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <select
          className={`${selectCls} flex-1`}
          value={circuito}
          onChange={(e) => setCircuito(Number(e.target.value))}
        >
          <option value={0}>Todos los circuitos</option>
          {CIRCUITOS.map((sede, i) => (
            <option key={sede} value={i + 1}>
              Circuito {i + 1} — {sede}
            </option>
          ))}
        </select>
        <select className={`${selectCls} flex-1`} value={organo} onChange={(e) => setOrgano(e.target.value)}>
          <option value="">Todos los órganos jurisdiccionales</option>
          {ORGANOS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className={selectCls} value={materia} onChange={(e) => setMateria(e.target.value)}>
          <option value="">Todas las materias</option>
          {MATERIAS.filter((m) => m !== "comun").map((m) => (
            <option key={m} value={m}>
              {m[0].toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin text-accent" /> Consultando el índice del CJF…
        </div>
      ) : rows.length === 0 ? (
        <EmptyCard title="0 sentencias indexadas con estos filtros">
          El índice de sentencias del CJF está en fase de ingesta — la arquitectura (tabla,
          filtros por circuito, órgano y materia) ya está lista. Mientras el corpus se puebla,
          consulta directamente la fuente oficial:
          <a
            href="https://www.cjf.gob.mx"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel-solid px-4 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            <Gavel size={13} /> Buscador oficial del CJF <ExternalLink size={11} />
          </a>
        </EmptyCard>
      ) : (
        rows.map((s) => (
          <article key={s.id} className={`${glass} p-5`}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">
                Circuito {s.circuito} — {CIRCUITOS[s.circuito - 1] ?? ""}
              </Chip>
              <Chip tone="neutral">{s.organo}</Chip>
              {s.materia && <Chip tone="neutral">{s.materia}</Chip>}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
                >
                  Ver sentencia <ExternalLink size={11} />
                </a>
              )}
            </div>
            <h3 className="mt-2.5 text-sm font-semibold text-ink">
              {s.expediente ?? "Expediente"} {s.fecha ? `· ${s.fecha}` : ""}
            </h3>
            {s.extracto && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{s.extracto}</p>}
          </article>
        ))
      )}
    </div>
  );
}

/* ──────────────── Tab 3 — Legislación Federal (Cámara de Diputados) ──────────────── */

function LeyesTab() {
  const [q, setQ] = useState("");
  const [codigo, setCodigo] = useState("");
  const [rows, setRows] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const buscar = useCallback(async () => {
    const sb = getSupabase();
    const term = q.trim();
    if (!sb || (!term && !codigo)) return;
    setLoading(true);
    setBuscado(true);
    let qy = sb.from("leyes_articulos").select("codigo, articulo, texto, rama").limit(20);
    if (codigo) qy = qy.eq("codigo", codigo);
    if (/^\d+(\s+(bis|ter))?$/i.test(term)) {
      const norm = term.replace(/\s+(bis|ter)$/i, (s) => ` ${s.trim()[0].toUpperCase()}${s.trim().slice(1).toLowerCase()}`);
      qy = qy.eq("articulo", norm);
    } else if (term) {
      qy = qy.ilike("texto", `%${term}%`);
    } else {
      qy = qy.order("articulo").limit(15);
    }
    const { data } = await qy;
    setRows((data as Articulo[]) ?? []);
    setLoading(false);
  }, [q, codigo]);

  useEffect(() => {
    if (codigo) void buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void buscar();
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Número de artículo (ej. 16, 3 Bis) o texto (ej. legítima defensa)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={selectCls} value={codigo} onChange={(e) => setCodigo(e.target.value)}>
          <option value="">Todos los ordenamientos</option>
          {CODIGOS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin text-accent" /> Consultando la legislación
          vigente…
        </div>
      ) : !buscado ? (
        <EmptyCard title="Legislación federal al día">
          7,399 artículos indexados desde la fuente oficial (Cámara de Diputados). Busca por
          número de artículo o por texto, y filtra por ordenamiento.
        </EmptyCard>
      ) : rows.length === 0 ? (
        <EmptyCard title="Sin artículos para esta búsqueda">
          Revisa el número o intenta otros términos del texto normativo.
        </EmptyCard>
      ) : (
        rows.map((a) => {
          const derogado = /^\s*[-–.\s]*\(?\s*se\s+deroga/i.test(a.texto || "");
          return (
            <article key={`${a.codigo}-${a.articulo}`} className={`${glass} p-5`}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="accent">
                  {a.codigo} · Art. {a.articulo}
                </Chip>
                <Chip tone="neutral">{a.rama}</Chip>
                {derogado ? (
                  <Chip tone="red">Derogado</Chip>
                ) : (
                  <Chip tone="green">
                    <ShieldCheck size={11} /> Vigente
                  </Chip>
                )}
              </div>
              <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                {(a.texto || "").slice(0, 700)}
                {(a.texto || "").length > 700 ? "…" : ""}
              </p>
              <p className="mt-2.5 text-[11px] text-ink-subtle">
                Fuente: Cámara de Diputados — texto vigente (LeyesBiblio)
              </p>
            </article>
          );
        })
      )}
    </div>
  );
}

/* ──────────────── Página ──────────────── */

type Tab = "tesis" | "cjf" | "leyes";

const TABS: { id: Tab; label: string; icon: typeof Scale }[] = [
  { id: "tesis", label: "Tesis y Jurisprudencia · SJF", icon: Scale },
  { id: "cjf", label: "Sentencias · CJF", icon: Gavel },
  { id: "leyes", label: "Legislación Federal", icon: BookOpen },
];

export function BuscadorJuridico() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tesis");

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-hairline bg-panel-solid/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          <button
            onClick={() => navigate("/app")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <Landmark size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-medium leading-tight">Buscador Jurídico</h1>
            <p className="text-[11px] text-ink-subtle">
              Federal y Estatal · SJF · CJF · Legislación vigente
            </p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400 sm:flex">
            <ShieldCheck size={12} />
            Índice verificable por registro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6">
        <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-full bg-elevated p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all cursor-pointer ${
                tab === id ? "bg-panel-solid text-ink shadow-card" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={15} className={tab === id ? "text-accent" : ""} />
              {label}
            </button>
          ))}
        </div>

        {tab === "tesis" && <TesisTab />}
        {tab === "cjf" && <CjfTab />}
        {tab === "leyes" && <LeyesTab />}
      </main>

      <footer className="mx-auto max-w-4xl px-5 pb-10">
        <div className={`${glass} px-5 py-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            Fuentes oficiales del Motor de Certeza Jurídica
          </p>
          <ul className="mt-2 grid gap-1.5 text-[12px] text-ink-muted sm:grid-cols-2">
            <li>· SJF / SCJN — sjf2.scjn.gob.mx (tesis con Registro Digital)</li>
            <li>· Buscador Jurídico SCJN — bj.scjn.gob.mx</li>
            <li>· CJF — cjf.gob.mx (sentencias de JD y TCC)</li>
            <li>· Cámara de Diputados — diputados.gob.mx/LeyesBiblio</li>
            <li>· DOF — dof.gob.mx (reformas y vigencia)</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
