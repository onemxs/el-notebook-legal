import { useState } from "react";
import { Archive, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/lib/workspace";

export function ArchiveDeleteModal() {
  const { caseAction, setCaseAction, archiveCase, deleteCase } = useWorkspace();
  const [confirmText, setConfirmText] = useState("");

  if (!caseAction) return null;

  const isDelete = caseAction.mode === "delete";

  const handleConfirm = () => {
    if (isDelete) {
      if (confirmText !== "ELIMINAR") return;
      deleteCase(caseAction.caseId);
    } else {
      archiveCase(caseAction.caseId);
    }
    setCaseAction(null);
    setConfirmText("");
  };

  const handleClose = () => {
    setCaseAction(null);
    setConfirmText("");
  };

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title={isDelete ? "Eliminar expediente" : "Archivar expediente"}
      subtitle={
        isDelete
          ? "Esta acción no se puede deshacer. Todos los documentos, mensajes y eventos asociados se eliminarán permanentemente."
          : "El expediente se archivará y dejará de aparecer en la vista activa."
      }
      icon={
        isDelete ? (
          <Trash2 size={18} className="text-danger" />
        ) : (
          <Archive size={18} />
        )
      }
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDelete && confirmText !== "ELIMINAR"}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all active:translate-y-px disabled:opacity-40 enabled:cursor-pointer ${
              isDelete
                ? "bg-danger hover:bg-danger/90"
                : "bg-accent hover:bg-accent-hover"
            }`}
          >
            {isDelete ? "Eliminar" : "Archivar"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-ink-muted">
        {isDelete
          ? `¿Eliminar permanentemente "${caseAction.caseName}"?`
          : `¿Archivar "${caseAction.caseName}"?`}
      </p>

      {isDelete && (
        <div>
          <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed">
              Esta acción eliminará todos los documentos, conversaciones y eventos
              del timeline asociados a este expediente. No podrás recuperarlos.
            </p>
          </div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Escribe <span className="font-mono font-bold text-danger">ELIMINAR</span> para confirmar
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            className="w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-danger focus:outline-none"
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
