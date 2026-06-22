import { useEffect, useRef, useState } from "react";
import { FolderPlus, ArrowRight, ScanText, Sparkles, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/lib/workspace";
import { BRANCH_LIST } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import type { BranchId } from "@/lib/types";

export function NewCaseModal() {
  const { caseModalOpen, caseModalPreset, closeCaseModal, branch, startCase, startIntake, settings, members } =
    useWorkspace();
  const despachoMode = settings.accountMode === "despacho";
  const [dragging, setDragging] = useState(false);
  const [abogadoId, setAbogadoId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<BranchId>(branch);
  const [name, setName] = useState("");

  useEffect(() => {
    if (caseModalOpen) {
      setSelected(caseModalPreset ?? branch);
      setName("");
      setAbogadoId("");
    }
  }, [caseModalOpen, caseModalPreset, branch]);

  const create = () => {
    startCase(selected, name, undefined, abogadoId || undefined);
  };

  return (
    <Modal
      open={caseModalOpen}
      onClose={closeCaseModal}
      title="Nuevo expediente"
      subtitle="Selecciona la rama del derecho para activar el marco regulatorio correcto"
      icon={<FolderPlus size={18} />}
      size="lg"
      footer={
        <div className="flex items-center justify-end">
          <button
            onClick={create}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer"
          >
            Crear expediente
            <ArrowRight size={16} />
          </button>
        </div>
      }
    >
      <label className="mb-1.5 block text-xs font-medium text-ink-muted" htmlFor="caseName">
        Nombre / número del expediente
      </label>
      <input
        id="caseName"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej. Juicio Ejecutivo Mercantil 482/2026"
        className="w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
      />

      {despachoMode && (
        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <UserRound size={13} />
            Asignar a abogado
          </label>
          <select
            value={abogadoId}
            onChange={(e) => setAbogadoId(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre_completo ?? "Sin nombre"}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="mb-2.5 text-xs font-medium text-ink-muted">Rama del derecho mexicano</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {BRANCH_LIST.map((b) => {
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                active
                  ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                  : "border-hairline bg-panel-solid hover:border-accent/40 hover:bg-accent-soft/30"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active ? "bg-accent text-white" : "bg-elevated text-accent"
                }`}
              >
                <BranchIcon id={b.id} size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{b.name}</p>
                <p className="text-[11px] leading-snug text-ink-muted">{b.tagline}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Intake dropzone — arrastra un archivo y la IA lo analiza */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">o</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) { closeCaseModal(); startIntake(file); }
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3.5 text-left transition-all ${
            dragging
              ? "border-accent bg-accent-soft scale-[1.01]"
              : "border-hairline bg-canvas/30 hover:border-accent/40 hover:bg-accent-soft/30"
          }`}
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            dragging ? "bg-accent text-white" : "bg-accent/10 text-accent"
          }`}>
            <ScanText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">Arrastra un expediente para análisis con IA</p>
            <p className="text-[11px] text-ink-muted">PDF, Word, imagen — la IA extrae los datos y detecta la rama</p>
          </div>
          <Sparkles size={16} className="shrink-0 text-accent" />
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { closeCaseModal(); startIntake(f); }
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
