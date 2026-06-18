import { ShieldCheck, ScrollText } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import type { Citation } from "@/lib/types";

export function SustentoLegal({ citations }: { citations: Citation[] }) {
  const { openArticle } = useWorkspace();
  if (!citations.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-hairline bg-aside p-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <ShieldCheck size={13} className="text-success" />
        <span className="label-caps text-[11px] text-ink-muted">Sustento Legal y Fuentes</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, index) => (
          <button
            key={c.id || `${c.codigo || 'ley'}-${c.articulo || index}`}
            onClick={() => openArticle(c)}
            title={`Ver texto literal de ${c.label}`}
            className="group flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent shadow-tactile transition-all hover:border-accent hover:bg-accent hover:text-white active:translate-y-px cursor-pointer"
          >
            <ScrollText size={13} />
            {c.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
        Clic en un fundamento para validar su texto literal en el Archivero.
      </p>
    </div>
  );
}
