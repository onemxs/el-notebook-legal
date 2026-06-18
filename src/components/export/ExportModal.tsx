import { useState } from "react";
import { FileSignature, FileText, FileType2, Eye, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SignaturePad } from "./SignaturePad";
import { useWorkspace } from "@/lib/workspace";
import { BRANCHES } from "@/lib/branches";
import { exportToWord, exportToPdf, type DocumentPayload } from "@/lib/export";

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { editorHtml, caseName, branch } = useWorkspace();
  const [signature, setSignature] = useState<string | null>(null);
  const [signer, setSigner] = useState("");
  const hasContent = editorHtml.trim().length > 0;

  const payload = (): DocumentPayload => ({
    title: "Documento legal",
    caseName,
    branchName: BRANCHES[branch].name,
    bodyHtml: editorHtml,
    signatureDataUrl: signature,
    signerName: signer.trim() || undefined,
    footer: `${caseName} · Materia ${BRANCHES[branch].name} · PasantIA`,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportación y Firma"
      subtitle="Previsualización con márgenes judiciales · firma autógrafa · Word y PDF"
      icon={<FileSignature size={18} />}
      size="lg"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
            <Info size={12} />
            La exportación a PDF usa el diálogo de impresión (Guardar como PDF).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => exportToWord(payload())}
              disabled={!hasContent}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-panel-solid px-4 py-2 text-[13px] font-semibold text-ink shadow-tactile transition-all hover:bg-elevated active:translate-y-px disabled:opacity-40 enabled:cursor-pointer"
            >
              <FileType2 size={15} className="text-accent" />
              Exportar a Word
            </button>
            <button
              onClick={() => exportToPdf(payload())}
              disabled={!hasContent}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 enabled:cursor-pointer"
            >
              <FileText size={15} />
              Exportar a PDF
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Print preview with judicial margins */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <Eye size={13} />
            Previsualización de impresión
          </div>
          <div className="scroll-zone max-h-[52vh] overflow-y-auto rounded-xl bg-canvas/60 p-4">
            <div className="mx-auto min-h-[595px] w-full max-w-[460px] bg-white shadow-float">
              <div className="h-full py-10 pl-16 pr-9">
                {hasContent ? (
                  <>
                    <div
                      className="prose-legal text-[13px] leading-relaxed text-slate-800"
                      style={{ color: "#1a202c" }}
                      dangerouslySetInnerHTML={{ __html: editorHtml }}
                    />
                    {signature && (
                      <div className="mt-8 flex flex-col items-center">
                        <img src={signature} alt="Firma" className="max-h-20" />
                        <div className="mt-1 w-52 border-t border-slate-800 pt-1 text-center text-[11px] text-slate-700">
                          {signer.trim() || "Firma autógrafa del promovente"}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                    Redacta o genera un documento en el editor para previsualizarlo aquí.
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-ink-subtle">
              Margen izquierdo amplio para costura/archivo · tamaño carta
            </p>
          </div>
        </div>

        {/* Signature module */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <FileSignature size={13} />
            Módulo de firma
          </div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="signer">
            Nombre del firmante
          </label>
          <input
            id="signer"
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            placeholder="Lic. Nombre Apellido"
            className="mb-3 w-full rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
          />
          <SignaturePad onChange={setSignature} />

          <div className="mt-4 rounded-xl border border-hairline bg-canvas/50 p-3 text-[11px] leading-relaxed text-ink-subtle">
            <span className="font-medium text-ink-muted">e.firma (a futuro):</span> estructura
            lista para asociar hashes de validación al documento exportado.
          </div>
        </div>
      </div>
    </Modal>
  );
}
