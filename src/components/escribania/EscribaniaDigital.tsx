import { useState } from "react";
import {
  FileText,
  FileSignature,
  ShieldCheck,
  Receipt,
  Building2,
  HeartHandshake,
  ScrollText,
  Printer,
  Loader2,
  Users,
  Gavel,
  Scale,
  Landmark,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { exportarTranscripcion } from "@/lib/export";

interface Field {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "date" | "number";
}

interface Template {
  id: string;
  title: string;
  desc: string;
  icon: typeof FileText;
  fields: Field[];
  category: "civil" | "mercantil" | "penal";
}

interface WizardStep {
  title: string;
  icon: typeof Users;
  fields: { key: string; label: string; placeholder: string; type?: "text" | "date" | "number" }[];
}

interface WizardToggle {
  key: string;
  label: string;
  desc: string;
}

const FIELD_SCHEMAS: Record<string, Field[]> = {
  arrendamiento: [
    { key: "arrendador", label: "Nombre del Arrendador / Dueño", placeholder: "Ej. Juan Pérez" },
    { key: "arrendatario", label: "Nombre del Arrendatario / Inquilino", placeholder: "Ej. María García" },
    { key: "domicilio", label: "Domicilio del Inmueble", placeholder: "Calle, número, colonia, CP" },
    { key: "renta", label: "Renta Mensual ($ MXN)", placeholder: "Ej. 15,000" },
    { key: "fechaInicio", label: "Fecha de Inicio", placeholder: "", type: "date" },
    { key: "fechaFin", label: "Fecha de Término", placeholder: "", type: "date" },
  ],
  servicios: [
    { key: "prestador", label: "Nombre del Prestador / Profesional", placeholder: "Ej. Lic. Roberto Méndez" },
    { key: "cliente", label: "Nombre del Cliente / Contratante", placeholder: "Ej. Carlos Fernández" },
    { key: "descripcion", label: "Descripción del Servicio", placeholder: "Ej. Consultoría legal corporativa" },
    { key: "honorarios", label: "Monto de Honorarios ($ MXN)", placeholder: "Ej. 50,000" },
    { key: "fechaInicio", label: "Fecha de Inicio", placeholder: "", type: "date" },
  ],
  nda: [
    { key: "parteReveladora", label: "Parte Reveladora", placeholder: "Nombre completo" },
    { key: "parteReceptora", label: "Parte Receptora", placeholder: "Nombre completo" },
    { key: "materia", label: "Materia de la Información Confidencial", placeholder: "Ej. Secretos comerciales, listas de clientes" },
    { key: "vigencia", label: "Vigencia de Confidencialidad", placeholder: "", type: "date" },
  ],
  pagare: [
    { key: "deudor", label: "Nombre del Deudor", placeholder: "Nombre completo" },
    { key: "acreedor", label: "Nombre del Acreedor", placeholder: "Nombre completo" },
    { key: "cantidad", label: "Cantidad Prestada ($ MXN)", placeholder: "Ej. 100,000" },
    { key: "vigencia", label: "Fecha de Vencimiento", placeholder: "", type: "date" },
    { key: "intereses", label: "Tasa de Interés Mensual", placeholder: "Ej. 2% mensual" },
  ],
  compraventa: [
    { key: "vendedor", label: "Nombre del Vendedor", placeholder: "Nombre completo" },
    { key: "comprador", label: "Nombre del Comprador", placeholder: "Nombre completo" },
    { key: "bien", label: "Descripción del Bien", placeholder: "Tipo, ubicación, dimensiones" },
    { key: "precio", label: "Precio de Venta ($ MXN)", placeholder: "Ej. 2,500,000" },
    { key: "fechaCierre", label: "Fecha de Cierre", placeholder: "", type: "date" },
  ],
  divorcio: [
    { key: "conyuge1", label: "Cónyuge 1", placeholder: "Nombre completo" },
    { key: "conyuge2", label: "Cónyuge 2", placeholder: "Nombre completo" },
    { key: "regimen", label: "Régimen Matrimonial", placeholder: "Ej. Sociedad conyugal / Separación de bienes" },
    { key: "domicilioConyugal", label: "Domicilio Conyugal", placeholder: "Dirección completa" },
    { key: "pension", label: "Pensión Alimenticia ($ MXN)", placeholder: "Ej. 8,000 mensuales" },
  ],
  contestacion: [
    { key: "demandado", label: "Nombre del Demandado", placeholder: "Nombre completo" },
    { key: "materia", label: "Materia del Juicio", placeholder: "Ej. Mercantil / Civil / Laboral" },
    { key: "cuantia", label: "Cuantía del Juicio ($ MXN)", placeholder: "Ej. 500,000" },
    { key: "juzgado", label: "Juzgado y Expediente", placeholder: "Ej. Juzgado 10 Civil, Exp. 482/2026" },
  ],
};

const JURISDICCIONES = [
  "Tribunales de la Ciudad de México",
  "Tribunales del Estado de México",
  "Tribunales de Jalisco",
  "Tribunales de Nuevo León",
  "Tribunales del Estado que corresponda",
];

// ponytail: wizard steps adapted per template; step 3 is always toggles, step 4 always jurisdiction
const WIZARD_STEPS: Record<string, WizardStep[]> = {
  arrendamiento: [
    { title: "Partes e inmueble", icon: Users, fields: [
      { key: "arrendador", label: "Arrendador / Dueño", placeholder: "Nombre completo" },
      { key: "arrendatario", label: "Arrendatario / Inquilino", placeholder: "Nombre completo" },
      { key: "domicilio", label: "Domicilio del Inmueble", placeholder: "Calle, número, colonia, CP", type: "text" },
    ]},
    { title: "Términos económicos", icon: Scale, fields: [
      { key: "vigencia", label: "Vigencia (meses)", placeholder: "Ej. 12", type: "number" },
      { key: "renta", label: "Renta mensual ($ MXN)", placeholder: "Ej. 15,000", type: "number" },
      { key: "moratorio", label: "% Interés moratorio mensual", placeholder: "Ej. 2", type: "number" },
    ]},
    { title: "Garantías adicionales", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  servicios: [
    { title: "Partes del contrato", icon: Users, fields: [
      { key: "prestador", label: "Prestador del servicio", placeholder: "Nombre completo" },
      { key: "cliente", label: "Cliente / Contratante", placeholder: "Nombre completo" },
    ]},
    { title: "Servicio y honorarios", icon: Scale, fields: [
      { key: "descripcion", label: "Descripción del servicio", placeholder: "Ej. Consultoría legal corporativa" },
      { key: "honorarios", label: "Honorarios ($ MXN)", placeholder: "Ej. 50,000", type: "number" },
      { key: "fechaInicio", label: "Fecha de inicio", placeholder: "", type: "date" },
    ]},
    { title: "Cláusulas especiales", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  nda: [
    { title: "Partes", icon: Users, fields: [
      { key: "parteReveladora", label: "Parte Reveladora", placeholder: "Nombre completo" },
      { key: "parteReceptora", label: "Parte Receptora", placeholder: "Nombre completo" },
    ]},
    { title: "Materia y vigencia", icon: Scale, fields: [
      { key: "materia", label: "Materia confidencial", placeholder: "Ej. Secretos comerciales" },
      { key: "vigencia", label: "Vigencia hasta", placeholder: "", type: "date" },
    ]},
    { title: "Penalidades", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  pagare: [
    { title: "Partes", icon: Users, fields: [
      { key: "deudor", label: "Deudor", placeholder: "Nombre completo" },
      { key: "acreedor", label: "Acreedor", placeholder: "Nombre completo" },
    ]},
    { title: "Términos del pagaré", icon: Scale, fields: [
      { key: "cantidad", label: "Cantidad prestada ($ MXN)", placeholder: "Ej. 100,000", type: "number" },
      { key: "vigencia", label: "Fecha de vencimiento", placeholder: "", type: "date" },
      { key: "intereses", label: "Tasa de interés mensual", placeholder: "Ej. 2%" },
    ]},
    { title: "Garantías", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  compraventa: [
    { title: "Partes", icon: Users, fields: [
      { key: "vendedor", label: "Vendedor", placeholder: "Nombre completo" },
      { key: "comprador", label: "Comprador", placeholder: "Nombre completo" },
    ]},
    { title: "Bien y precio", icon: Scale, fields: [
      { key: "bien", label: "Descripción del bien", placeholder: "Tipo, ubicación, dimensiones" },
      { key: "precio", label: "Precio de venta ($ MXN)", placeholder: "Ej. 2,500,000", type: "number" },
      { key: "fechaCierre", label: "Fecha de cierre", placeholder: "", type: "date" },
    ]},
    { title: "Garantías", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  divorcio: [
    { title: "Identidad de cónyuges", icon: Users, fields: [
      { key: "conyuge1", label: "Cónyuge 1", placeholder: "Nombre completo" },
      { key: "conyuge2", label: "Cónyuge 2", placeholder: "Nombre completo" },
      { key: "regimen", label: "Régimen matrimonial", placeholder: "Sociedad conyugal / Separación de bienes" },
    ]},
    { title: "Hijos y pensión", icon: Scale, fields: [
      { key: "domicilioConyugal", label: "Domicilio conyugal", placeholder: "Dirección completa" },
      { key: "pension", label: "Pensión alimenticia ($ MXN)", placeholder: "Ej. 8,000", type: "number" },
    ]},
    { title: "Bienes y garantías", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
  contestacion: [
    { title: "Identidad del demandado", icon: Users, fields: [
      { key: "demandado", label: "Demandado", placeholder: "Nombre completo" },
      { key: "juzgado", label: "Juzgado y expediente", placeholder: "Ej. Juzgado 10 Civil, Exp. 482/2026" },
    ]},
    { title: "Datos del juicio", icon: Scale, fields: [
      { key: "materia", label: "Materia del juicio", placeholder: "Ej. Mercantil / Civil / Laboral" },
      { key: "cuantia", label: "Cuantía ($ MXN)", placeholder: "Ej. 500,000", type: "number" },
    ]},
    { title: "Estrategia de defensa", icon: Gavel, fields: []},
    { title: "Jurisdicción", icon: Landmark, fields: []},
  ],
};

const WIZARD_TOGGLES: Record<string, WizardToggle[]> = {
  arrendamiento: [
    { key: "fiador", label: "Incluir Fiador / Obligado Solidario", desc: "Agrega sección para datos del fiador en el contrato" },
    { key: "extincion_dominio", label: "Cláusula de Extinción de Dominio", desc: "Declaración de procedencia lícita de recursos" },
  ],
  servicios: [
    { key: "confidencialidad", label: "Cláusula de Confidencialidad", desc: "Protege la información del cliente" },
    { key: "exclusividad", label: "Cláusula de Exclusividad", desc: "El prestador no podrá trabajar con competidores" },
  ],
  nda: [
    { key: "penalidad_nda", label: "Penalidad por incumplimiento", desc: "Establece una multa por violación de confidencialidad" },
    { key: "indemnizacion", label: "Cláusula de Indemnización", desc: "La parte receptora indemiza a la reveladora" },
  ],
  pagare: [
    { key: "aval", label: "Incluir Aval / Codeudor", desc: "Agrega un obligado solidario al pagaré" },
    { key: "garantia_prenda", label: "Garantía Prendaria", desc: "Constituye una prenda como garantía del pago" },
  ],
  compraventa: [
    { key: "saneamiento", label: "Cláusula de Saneamiento", desc: "El vendedor responde por vicios ocultos y evicción" },
    { key: "arras", label: "Arras Penitenciales", desc: "Establece una penalidad por desistimiento" },
  ],
  divorcio: [
    { key: "hijos_menores", label: "Hijos menores de edad", desc: "Incluye régimen de custodia, convivencia y alimentos" },
    { key: "violencia", label: "Medidas de Protección", desc: "Agrega medidas provisionales contra violencia familiar" },
  ],
  contestacion: [
    { key: "excepciones_detalle", label: "Excepciones detalladas", desc: "Incluye defensas de fondo y procesales" },
    { key: "pruebas_ofrecidas", label: "Ofrecimiento de pruebas", desc: "Agrega capítulo de pruebas con ofrecimiento formal" },
  ],
};

const TEMPLATES: Template[] = [
  { id: "arrendamiento", title: "Contrato de Arrendamiento", desc: "Inmobiliario con cláusulas de garantía, mantenimiento y términos de pago", icon: Building2, fields: FIELD_SCHEMAS.arrendamiento, category: "civil" },
  { id: "servicios", title: "Prestación de Servicios", desc: "Honorarios, alcances, confidencialidad y causas de rescisión", icon: FileSignature, fields: FIELD_SCHEMAS.servicios, category: "mercantil" },
  { id: "nda", title: "Confidencialidad (NDA)", desc: "Acuerdo de confidencialidad recíproco con protección de información sensible", icon: ShieldCheck, fields: FIELD_SCHEMAS.nda, category: "mercantil" },
  { id: "pagare", title: "Pagaré Ejecutivo", desc: "Título ejecutivo mercantil con intereses y fecha de vencimiento", icon: Receipt, fields: FIELD_SCHEMAS.pagare, category: "mercantil" },
  { id: "compraventa", title: "Compraventa de Bienes", desc: "Transmisión de propiedad con declaraciones, precio y condiciones", icon: FileText, fields: FIELD_SCHEMAS.compraventa, category: "civil" },
  { id: "divorcio", title: "Convenio de Divorcio", desc: "Voluntario con propuesta de liquidación de sociedad conyugal y custodia", icon: HeartHandshake, fields: FIELD_SCHEMAS.divorcio, category: "civil" },
  { id: "contestacion", title: "Contestación de Demanda", desc: "Formato profesional con estructura de excepciones, defensas y ofrecimiento de pruebas", icon: ScrollText, fields: FIELD_SCHEMAS.contestacion, category: "mercantil" },
];

export function EscribaniaDigital() {
  const { selectedTemplate, setSelectedTemplate, documentPreview, docGenLoading, generateCustomDocument } = useWorkspace();
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [generationMode, setGenerationMode] = useState<"express" | "wizard" | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardVars, setWizardVars] = useState<Record<string, string>>({});
  const [wizardToggles, setWizardToggles] = useState<Record<string, boolean>>({});
  const [wizardJurisdiccion, setWizardJurisdiccion] = useState(JURISDICCIONES[0]);

  const CATEGORIES = ["Todos", "Civil/Familiar", "Mercantil", "Penal/Amparo"] as const;
  const CATEGORY_MAP: Record<string, string> = { "Civil/Familiar": "civil", Mercantil: "mercantil", "Penal/Amparo": "penal" };

  const filtered = activeCategory === "Todos" ? TEMPLATES : TEMPLATES.filter((t) => t.category === CATEGORY_MAP[activeCategory]);

  const templ = selectedTemplate ? TEMPLATES.find((t) => t.id === selectedTemplate) : null;

  const select = (id: string) => {
    setSelectedTemplate(id);
    setVariables({});
    setNotes("");
    setGenerationMode(null);
    setWizardStep(1);
    setWizardVars({});
    setWizardToggles({});
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    generateCustomDocument(selectedTemplate, variables, notes);
  };

  const handleWizardGenerate = () => {
    if (!selectedTemplate) return;
    const tId = selectedTemplate;
    const vars: Record<string, string> = { ...wizardVars, jurisdiccion: wizardJurisdiccion };
    // Map toggles to "Sí"/"No" variables
    const toggles = WIZARD_TOGGLES[tId] || [];
    for (const t of toggles) {
      vars[t.key] = wizardToggles[t.key] ? "Sí" : "No";
    }
    generateCustomDocument(tId, vars, notes);
  };

  const fields = templ?.fields ?? [];

  const wizardSteps = selectedTemplate ? WIZARD_STEPS[selectedTemplate] : null;
  const wizardTogglesList = selectedTemplate ? WIZARD_TOGGLES[selectedTemplate] || [] : [];

  const StepIcon = wizardSteps?.[wizardStep - 1]?.icon || FileText;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Category header */}
      <div className="shrink-0 border-b border-hairline px-5 py-3">
        <h2 className="font-serif text-base font-semibold text-ink">Notaría Express</h2>
        <p className="text-xs text-ink-muted">Selecciona un documento y llénalo con los datos del caso</p>
      </div>

      {/* Category tabs */}
      <div className="shrink-0 border-b border-hairline">
        <div className="flex justify-center py-4">
          <div className="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedTemplate(null); }}
                className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-white text-[#022448] shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-gray-500 hover:text-[#022448] dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template catalog */}
      <div className="shrink-0 border-b border-hairline">
        <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto py-4">
          {filtered.map((t) => {
            const active = selectedTemplate === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                className={`flex w-44 flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                    : "border-hairline bg-panel-solid/40 hover:border-accent/40 hover:bg-accent-soft/30"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                  <Icon size={18} />
                </span>
                <p className="text-sm font-semibold leading-tight text-ink">{t.title}</p>
                <p className="text-[10px] leading-snug text-ink-muted">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generator area */}
      {templ && !generationMode ? (
        <div className="flex flex-1 items-center justify-center bg-canvas">
          <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white/60 p-8 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="mb-2 text-center font-serif text-xl font-medium text-ink">Modo de redacción</h3>
            <p className="mb-6 text-center text-sm text-ink-muted">¿Cómo prefieres redactar este documento?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGenerationMode("express")}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-panel-solid/60 px-5 py-4 text-left transition-all hover:border-accent/40 hover:bg-accent-soft/30 cursor-pointer"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><FileText size={20} /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">⚡ Modo Express</p>
                  <p className="text-xs text-ink-muted">Formulario tradicional — directo y rápido</p>
                </div>
              </button>
              <button
                onClick={() => setGenerationMode("wizard")}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-panel-solid/60 px-5 py-4 text-left transition-all hover:border-accent/40 hover:bg-accent-soft/30 cursor-pointer"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><ScrollText size={20} /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">🧭 Asistente Guiado paso a paso</p>
                  <p className="text-xs text-ink-muted">Recomendado — incluye todas las cláusulas de blindaje</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : generationMode === "wizard" && wizardSteps ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-full flex-col border-r border-hairline bg-aside p-6">
            {/* Progress bar */}
            <div className="mb-6 flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= wizardStep ? "bg-accent" : "bg-elevated"}`} />
              ))}
            </div>
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-ink-muted">
              <span className="inline-flex items-center gap-2"><StepIcon size={14} /> Paso {wizardStep} de 4 — {wizardSteps[wizardStep - 1]?.title}</span>
            </p>

            {/* Step 1-2: Field forms */}
            {(wizardStep === 1 || wizardStep === 2) && (
              <div className="flex-1 space-y-4 overflow-y-auto scroll-zone pr-2">
                {wizardSteps[wizardStep - 1].fields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor={`w-${f.key}`}>{f.label}</label>
                    <input id={`w-${f.key}`} type={f.type === "date" ? "date" : "text"} value={wizardVars[f.key] ?? ""} onChange={(e) => setWizardVars((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none" />
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Toggles */}
            {wizardStep === 3 && (
              <div className="flex-1 space-y-4 overflow-y-auto scroll-zone pr-2">
                <p className="text-xs text-ink-muted mb-3">Activa las cláusulas adicionales que deseas incluir:</p>
                {wizardTogglesList.length > 0 ? wizardTogglesList.map((t) => (
                  <div key={t.key} className="flex items-center justify-between rounded-xl border border-hairline bg-panel-solid/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{t.label}</p>
                      <p className="text-xs text-ink-muted">{t.desc}</p>
                    </div>
                    <button
                      onClick={() => setWizardToggles((p) => ({ ...p, [t.key]: !p[t.key] }))}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${wizardToggles[t.key] ? "bg-accent" : "bg-gray-300"}`}
                    >
                      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${wizardToggles[t.key] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-ink-muted text-center py-8">No hay cláusulas adicionales disponibles para este documento.</p>
                )}
              </div>
            )}

            {/* Step 4: Jurisdicción + notes */}
            {wizardStep === 4 && (
              <div className="flex-1 space-y-4 overflow-y-auto scroll-zone pr-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor="w-jurisdiccion">Jurisdicción — Tribunales competentes</label>
                  <select id="w-jurisdiccion" value={wizardJurisdiccion} onChange={(e) => setWizardJurisdiccion(e.target.value)} className="w-full rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none">
                    {JURISDICCIONES.map((j) => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor="w-notes">Instrucciones Especiales del Abogado</label>
                  <textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Ej. Incluir cláusula de mediación previa al arbitraje…" className="w-full resize-none rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none" />
                </div>
                <p className="text-xs text-ink-muted">Confirma los datos y genera el instrumento blindado con todas las cláusulas de protección.</p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-30 cursor-pointer"
              >
                ← Anterior
              </button>
              {wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep((s) => s + 1)}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  onClick={handleWizardGenerate}
                  disabled={docGenLoading}
                  className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 cursor-pointer"
                >
                  {docGenLoading ? <><Loader2 size={16} className="animate-spin" /> Redactando…</> : <><ScrollText size={16} /> Generar Instrumento Blindado</>}
                </button>
              )}
            </div>
          </div>

          {/* Preview column */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {docGenLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="animate-spin text-accent" />
                  <p className="text-sm text-ink-muted">Generando documento blindado con IA…</p>
                </div>
              </div>
            ) : documentPreview ? (
              <>
                <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
                  <p className="text-xs font-medium text-ink-muted">Vista previa</p>
                  <button
                    onClick={() => exportarTranscripcion(
                      `${templ?.title ?? "Documento"} — ${(fields[0] && wizardVars[fields[0].key]) || (fields[0] && variables[fields[0].key]) || "Cliente"}`,
                      documentPreview.replace(/<[^>]+>/g, ""),
                    )}
                    className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
                  >
                    <Printer size={14} />
                    Exportar PDF
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-canvas p-6 scroll-zone">
                  <div className="mx-auto max-w-[21cm] rounded-xl border border-hairline bg-white p-8 shadow-card">
                    <div className="prose prose-sm max-w-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} dangerouslySetInnerHTML={{ __html: documentPreview }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center">
                <div>
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent mx-auto"><ScrollText size={24} strokeWidth={1.5} /></span>
                  <p className="text-sm text-ink-muted">Completa los pasos y genera el instrumento</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : templ ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column — variable form */}
          <div className="flex w-[30vw] min-w-[320px] max-w-[420px] shrink-0 flex-col border-r border-hairline bg-aside p-4">
            <div className="flex-1 space-y-4 overflow-y-auto scroll-zone pr-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Datos del documento</h3>
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor={`f-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    id={`f-${f.key}`}
                    type={f.type ?? "text"}
                    value={variables[f.key] ?? ""}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none [color-scheme:light]"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor="notes">
                  Instrucciones Especiales del Abogado
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Incluir cláusula de mediación previa al arbitraje, excluir daños indirectos…"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={docGenLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 cursor-pointer"
            >
              {docGenLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Redactando…</>
              ) : (
                <><ScrollText size={16} /> Redactar Documento Fundamentado</>
              )}
            </button>
          </div>

          {/* Right column — document preview */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {docGenLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="animate-spin text-accent" />
                  <p className="text-sm text-ink-muted">Generando documento con IA…</p>
                </div>
              </div>
            ) : documentPreview ? (
              <>
                <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
                  <p className="text-xs font-medium text-ink-muted">Vista previa</p>
                  <button
                    onClick={() => exportarTranscripcion(
                      `${templ?.title ?? "Documento"} — ${(fields[0] && variables[fields[0].key]) ?? "Cliente"}`,
                      documentPreview.replace(/<[^>]+>/g, ""),
                    )}
                    className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
                  >
                    <Printer size={14} />
                    Exportar PDF
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-canvas p-6 scroll-zone">
                  <div className="mx-auto max-w-[21cm] rounded-xl border border-hairline bg-white p-8 shadow-card">
                    <div
                      className="prose prose-sm max-w-none"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      dangerouslySetInnerHTML={{ __html: documentPreview }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center">
                <div>
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent mx-auto">
                    <FileText size={24} strokeWidth={1.5} />
                  </span>
                  <p className="text-sm text-ink-muted">Llena los datos y haz clic en <strong>Redactar</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center">
          <div>
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent mx-auto">
              <ScrollText size={24} strokeWidth={1.5} />
            </span>
            <h3 className="text-base font-semibold text-ink">Selecciona una plantilla</h3>
            <p className="mt-1 text-sm text-ink-muted">Elige el tipo de documento arriba para empezar</p>
          </div>
        </div>
      )}
    </div>
  );
}
