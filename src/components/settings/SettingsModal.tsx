import { useState, type ReactNode } from "react";
import {
  Settings2,
  Zap,
  BrainCircuit,
  Lock,
  Database,
  UploadCloud,
  ShieldHalf,
  CheckCircle2,
  CircleCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useWorkspace } from "@/lib/workspace";
import { CORPUS_SIZE } from "@/lib/corpus";
import type { ModelId } from "@/lib/types";

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
      {icon}
      {children}
    </h3>
  );
}

const MODELS: { id: ModelId; name: string; desc: string; icon: typeof Zap }[] = [
  { id: "rapido", name: "Rápido", desc: "Resúmenes de expediente y consultas ágiles.", icon: Zap },
  {
    id: "profundo",
    name: "Razonamiento profundo",
    desc: "Estrategias de litigio complejas y análisis exhaustivo.",
    icon: BrainCircuit,
  },
];

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const onGaceta = () => {
    setDragging(false);
    updateSettings({ datasetUpdatedAt: "13 jun 2026" });
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 3200);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración Avanzada"
      subtitle="Motor de IA · dataset jurídico · secreto profesional"
      icon={<Settings2 size={18} />}
      size="md"
    >
      {/* A. AI model control */}
      <section className="mb-6">
        <SectionTitle icon={<BrainCircuit size={13} />}>Control del modelo de IA</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {MODELS.map((m) => {
            const active = settings.model === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => updateSettings({ model: m.id })}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                    : "border-hairline bg-panel-solid hover:border-accent/40"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      active ? "bg-accent text-white" : "bg-elevated text-accent"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  {active && <CircleCheck size={17} className="text-accent" />}
                </div>
                <span className="text-sm font-semibold text-ink">{m.name}</span>
                <span className="text-[11px] leading-relaxed text-ink-muted">{m.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-hairline bg-canvas/50 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-ink-muted">
              <Lock size={15} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-ink">Gobernanza de temperatura</p>
              <p className="text-[11px] text-ink-muted">
                Bloqueada para respuestas literales basadas en datos indexados.
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-success/10 px-2.5 py-1 font-mono text-sm font-semibold text-success">
            0.0
          </span>
        </div>
      </section>

      {/* B. Legal dataset manager */}
      <section className="mb-6">
        <SectionTitle icon={<Database size={13} />}>Gestor del dataset jurídico</SectionTitle>
        <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-hairline bg-panel-solid px-3.5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink">Base de datos activa</p>
            <p className="text-[11px] text-ink-muted">
              {CORPUS_SIZE} preceptos indexados · códigos federales y locales
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-ink-subtle">Actualizado</p>
            <p className="text-[13px] font-semibold text-ink">{settings.datasetUpdatedAt}</p>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            onGaceta();
          }}
          onClick={onGaceta}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onGaceta()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-all ${
            dragging ? "border-accent bg-accent-soft" : "border-hairline hover:border-accent/50"
          }`}
        >
          {justUpdated ? (
            <span className="flex items-center gap-2 text-sm font-medium text-success animate-fade-in">
              <CheckCircle2 size={18} />
              Gaceta procesada · vectores actualizados
            </span>
          ) : (
            <>
              <UploadCloud size={20} className="text-accent" />
              <p className="text-[13px] font-medium text-ink">Carga manual de Gacetas / DOF</p>
              <p className="text-[11px] text-ink-subtle">
                Arrastra el PDF de una reforma para re-indexar los artículos en Supabase
              </p>
            </>
          )}
        </div>
      </section>

      {/* C. Privacy & professional secrecy */}
      <section>
        <SectionTitle icon={<ShieldHalf size={13} />}>
          Privacidad y secreto profesional
        </SectionTitle>
        <div className="flex items-start gap-3 rounded-xl border border-hairline bg-panel-solid px-3.5 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ShieldHalf size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink">Modo Sesión Segura</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
              Al cerrar la pestaña se eliminan por completo los documentos del cliente y sus
              vectores en Supabase. Solo se conserva lo que exportes a tu computadora.
            </p>
          </div>
          <Toggle
            checked={settings.secureSession}
            onChange={(v) => updateSettings({ secureSession: v })}
            label="Activar modo sesión segura"
          />
        </div>
        {settings.secureSession && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-success animate-fade-in">
            <CheckCircle2 size={12} />
            Borrado automático activo · secreto profesional protegido al 100%.
          </p>
        )}
      </section>
    </Modal>
  );
}
