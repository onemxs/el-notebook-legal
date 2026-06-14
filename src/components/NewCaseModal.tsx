import { useEffect, useState } from "react";
import { FolderPlus, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/lib/workspace";
import { BRANCH_LIST } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import type { BranchId } from "@/lib/types";

export function NewCaseModal() {
  const { caseModalOpen, caseModalPreset, closeCaseModal, branch, startCase } =
    useWorkspace();
  const [selected, setSelected] = useState<BranchId>(branch);
  const [name, setName] = useState("");

  useEffect(() => {
    if (caseModalOpen) {
      setSelected(caseModalPreset ?? branch);
      setName("");
    }
  }, [caseModalOpen, caseModalPreset, branch]);

  const create = () => {
    startCase(selected, name);
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
        className="mb-5 w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
      />

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
    </Modal>
  );
}
