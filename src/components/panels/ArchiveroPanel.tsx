import type { ReactNode } from "react";
import { FolderOpen, Scale } from "lucide-react";
import { ExpedienteDropzone } from "@/components/archivero/ExpedienteDropzone";
import { LawFilters } from "@/components/archivero/LawFilters";
import { ArticleViewer } from "@/components/archivero/ArticleViewer";

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-ink-muted">{icon}</span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {title}
      </h2>
    </div>
  );
}

export function ArchiveroPanel() {
  return (
    <aside className="relative flex h-full w-full flex-col border-r border-hairline bg-aside">
      <header className="border-b border-hairline px-4 py-3.5">
        <h1 className="label-caps text-[11px] text-ink-muted">Archivero Legal</h1>
        <p className="mt-1 text-xs text-ink-subtle">Expediente y marco normativo</p>
      </header>

      <div className="scroll-zone flex-1 overflow-y-auto px-4 py-4">
        <SectionHeader icon={<FolderOpen size={14} />} title="Expediente" />
        <ExpedienteDropzone />

        <div className="my-5 h-px bg-hairline" />

        <SectionHeader icon={<Scale size={14} />} title="Filtro de leyes" />
        <LawFilters />
      </div>

      <ArticleViewer />
    </aside>
  );
}
