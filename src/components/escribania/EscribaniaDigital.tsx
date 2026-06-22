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
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { exportarTranscripcion } from "@/lib/export";

interface Template {
  id: string;
  title: string;
  desc: string;
  icon: typeof FileText;
  variables: { key: string; label: string; placeholder: string }[];
}

const TEMPLATES: Template[] = [
  {
    id: "arrendamiento",
    title: "Contrato de Arrendamiento",
    desc: "Inmobiliario con cláusulas de garantía, mantenimiento y términos de pago",
    icon: Building2,
    variables: [
      { key: "nombre", label: "Nombre del arrendador e inquilino", placeholder: "Ej. Juan Pérez y María García" },
      { key: "inmueble", label: "Domicilio del inmueble", placeholder: "Calle, número, colonia, CP" },
      { key: "monto", label: "Renta mensual", placeholder: "Ej. $15,000 MXN" },
      { key: "vigencia", label: "Vigencia del contrato", placeholder: "Ej. 1 año (ene-dic 2026)" },
    ],
  },
  {
    id: "servicios",
    title: "Prestación de Servicios",
    desc: "Honorarios, alcances, confidencialidad y causas de rescisión",
    icon: FileSignature,
    variables: [
      { key: "nombre", label: "Prestador y contratante", placeholder: "Nombres completos" },
      { key: "servicio", label: "Descripción del servicio", placeholder: "Ej. Consultoría legal corporativa" },
      { key: "monto", label: "Honorarios", placeholder: "Ej. $50,000 MXN + IVA" },
      { key: "vigencia", label: "Plazo de ejecución", placeholder: "Ej. 6 meses" },
    ],
  },
  {
    id: "nda",
    title: "Confidencialidad (NDA)",
    desc: "Acuerdo de confidencialidad recíproco con protección de información sensible",
    icon: ShieldCheck,
    variables: [
      { key: "nombre", label: "Partes del acuerdo", placeholder: "Nombres completos" },
      { key: "materia", label: "Materia de la información confidencial", placeholder: "Ej. Secretos comerciales, listas de clientes" },
      { key: "vigencia", label: "Vigencia de confidencialidad", placeholder: "Ej. 3 años" },
    ],
  },
  {
    id: "pagare",
    title: "Pagaré Ejecutivo",
    desc: "Título ejecutivo mercantil con intereses y fecha de vencimiento",
    icon: Receipt,
    variables: [
      { key: "nombre", label: "Deudor y acreedor", placeholder: "Nombres completos" },
      { key: "monto", label: "Cantidad prestada", placeholder: "Ej. $100,000 MXN" },
      { key: "vigencia", label: "Fecha de vencimiento", placeholder: "Ej. 31 diciembre 2026" },
      { key: "intereses", label: "Tasa de interés mensual", placeholder: "Ej. 2% mensual" },
    ],
  },
  {
    id: "compraventa",
    title: "Compraventa de Bienes",
    desc: "Transmisión de propiedad con declaraciones, precio y condiciones",
    icon: FileText,
    variables: [
      { key: "nombre", label: "Vendedor y comprador", placeholder: "Nombres completos" },
      { key: "inmueble", label: "Descripción del bien", placeholder: "Tipo, ubicación, dimensiones" },
      { key: "monto", label: "Precio de venta", placeholder: "Ej. $2,500,000 MXN" },
      { key: "vigencia", label: "Fecha de cierre", placeholder: "Ej. 30 marzo 2026" },
    ],
  },
  {
    id: "divorcio",
    title: "Convenio de Divorcio",
    desc: "Voluntario con propuesta de liquidación de sociedad conyugal y custodia",
    icon: HeartHandshake,
    variables: [
      { key: "nombre", label: "Cónyuges", placeholder: "Nombres completos de ambos" },
      { key: "materia", label: "Régimen matrimonial", placeholder: "Ej. Sociedad conyugal / Separación de bienes" },
      { key: "inmueble", label: "Domicilio conyugal", placeholder: "Dirección completa" },
      { key: "monto", label: "Pensión alimenticia", placeholder: "Ej. $8,000 MXN mensuales" },
    ],
  },
  {
    id: "contestacion",
    title: "Contestación de Demanda",
    desc: "Formato profesional con estructura de excepciones, defensas y ofrecimiento de pruebas",
    icon: ScrollText,
    variables: [
      { key: "nombre", label: "Demandado", placeholder: "Nombre completo" },
      { key: "materia", label: "Materia del juicio", placeholder: "Ej. Mercantil / Civil / Laboral" },
      { key: "monto", label: "Cuantía del juicio", placeholder: "Ej. $500,000 MXN" },
      { key: "vigencia", label: "Juzgado y expediente", placeholder: "Ej. Juzgado 10 Civil, Exp. 482/2026" },
    ],
  },
];

export function EscribaniaDigital() {
  const { selectedTemplate, setSelectedTemplate, documentPreview, docGenLoading, generateCustomDocument } = useWorkspace();
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const templ = selectedTemplate ? TEMPLATES.find((t) => t.id === selectedTemplate) : null;

  const select = (id: string) => {
    setSelectedTemplate(id);
    setVariables({});
    setNotes("");
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    generateCustomDocument(selectedTemplate, variables, notes);
  };

  const varFields = templ?.variables ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Category header */}
      <div className="shrink-0 border-b border-hairline px-5 py-3">
        <h2 className="font-serif text-base font-semibold text-ink">Escribanía Digital</h2>
        <p className="text-xs text-ink-muted">Selecciona un documento y llénalo con los datos del caso</p>
      </div>

      {/* Template catalog */}
      <div className="shrink-0 overflow-x-auto border-b border-hairline scroll-zone">
        <div className="flex gap-3 px-5 py-4">
          {TEMPLATES.map((t) => {
            const active = selectedTemplate === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                className={`flex w-40 shrink-0 flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
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

      {/* Generator area — two columns */}
      {templ ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column — variable form */}
          <div className="flex w-[30vw] min-w-[320px] max-w-[420px] shrink-0 flex-col border-r border-hairline bg-aside p-4">
            <div className="flex-1 space-y-4 overflow-y-auto scroll-zone pr-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Datos del documento</h3>
              {varFields.map((vf) => (
                <div key={vf.key}>
                  <label className="mb-1 block text-[12px] font-medium text-ink" htmlFor={`var-${vf.key}`}>
                    {vf.label}
                  </label>
                  <input
                    id={`var-${vf.key}`}
                    value={variables[vf.key] || ""}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [vf.key]: e.target.value }))}
                    placeholder={vf.placeholder}
                    className="w-full rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
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
                      `${templ?.title ?? "Documento"} — ${variables["nombre"] ?? "Cliente"}`,
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
