import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Type,
  File,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { isVideoFile, transcribeVideo } from "@/lib/transcribe";
import type { CaseFile, CaseFileKind } from "@/lib/types";

let fid = 0;
const newId = () => `f-${Date.now().toString(36)}-${(fid++).toString(36)}`;

const KIND_ICON: Record<CaseFileKind, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  image: ImageIcon,
  text: Type,
  video: Video,
};

export function ExpedienteDropzone() {
  const { files, addFiles, ingestDocument, removeFile, caseName } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [transcriptionProgress, setTranscriptionProgress] = useState<{
    fileId: string;
    status: string;
    progress: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = (list: FileList | null) => {
    if (!list || !list.length) return;
    Array.from(list).forEach((f) => {
      if (isVideoFile(f)) {
        ingestVideo(f);
      } else {
        ingestDocument(f);
      }
    });
  };

  const ingestVideo = async (videoFile: File) => {
    const fileId = `v-${Date.now()}`;
    const fileEntry: CaseFile = {
      id: fileId,
      name: videoFile.name,
      kind: "video",
      size: `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`,
      addedAt: Date.now(),
      analyzing: true,
    };
    addFiles([fileEntry]);

    try {
      const result = await transcribeVideo(videoFile, caseName, (progress) => {
        setTranscriptionProgress({
          fileId,
          status: progress.message,
          progress: progress.progress,
        });

        if (progress.status === "complete" && result) {
          const transcriptFile: CaseFile = {
            id: `${fileId}-transcript`,
            name: `Transcripción: ${videoFile.name}`,
            kind: "text",
            size: `${(result.transcription.length / 1024).toFixed(1)} KB`,
            addedAt: Date.now(),
          };
          addFiles([transcriptFile]);
          setTranscriptionProgress(null);
          removeFile(fileId);
        }
      });
    } catch (error) {
      console.error("Error transcribing video:", error);
      setTranscriptionProgress(null);
      removeFile(fileId);
    }
  };

  const addKeyword = () => {
    const v = keyword.trim();
    if (!v) return;
    const note: CaseFile = {
      id: newId(),
      name: v,
      kind: "text",
      size: "nota",
      addedAt: Date.now(),
    };
    addFiles([note]);
    setKeyword("");
  };

  return (
    <section aria-label="Expediente">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          ingest(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-all duration-200 ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-hairline bg-canvas/40 hover:border-accent/50 hover:bg-accent-soft/40"
        }`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            dragging ? "bg-accent text-white" : "bg-elevated text-accent"
          }`}
        >
          <UploadCloud size={20} strokeWidth={1.75} />
        </span>
        <p className="text-sm font-medium text-ink">Arrastra un documento o video</p>
        <p className="flex items-center gap-1 text-xs text-ink-subtle">
          <Sparkles size={11} className="text-accent" />
          PDF, imagen, texto o video (hasta 2 horas) — la IA lo analiza
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.mkv,.webm"
          className="hidden"
          onChange={(e) => {
            ingest(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          placeholder="Añadir hecho o palabra clave…"
          aria-label="Añadir hecho o palabra clave"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-panel-solid px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
        />
        <button
          onClick={addKeyword}
          aria-label="Añadir nota"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover cursor-pointer"
        >
          <Plus size={18} />
        </button>
      </div>

      {transcriptionProgress && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-accent" />
            <p className="text-[12px] font-medium text-ink">{transcriptionProgress.status}</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${transcriptionProgress.progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-ink-subtle">
            {transcriptionProgress.progress}% — Puede tomar varios minutos para videos largos
          </p>
        </div>
      )}

      {files.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {files.map((f) => {
            const Icon = KIND_ICON[f.kind];
            return (
              <li
                key={f.id}
                className="group flex items-center gap-2.5 rounded-lg border border-hairline bg-panel-solid px-2.5 py-2 animate-slide-up"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    f.analyzing ? "bg-accent text-white" : "bg-accent-soft text-accent"
                  }`}
                >
                  {f.analyzing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Icon size={15} strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{f.name}</p>
                  <p
                    className={`text-[11px] uppercase tracking-wide ${
                      f.analyzing ? "text-accent" : "text-ink-subtle"
                    }`}
                  >
                    {f.analyzing ? "Analizando con IA…" : `${f.kind} · ${f.size}`}
                  </p>
                </div>
                {!f.analyzing && (
                  <button
                    onClick={() => removeFile(f.id)}
                    aria-label={`Eliminar ${f.name}`}
                    className="rounded-md p-1.5 text-ink-subtle opacity-0 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-canvas/50 px-3 py-2.5 text-xs text-ink-subtle">
          <File size={14} />
          <span>Sin documentos en el expediente todavía.</span>
        </div>
      )}
    </section>
  );
}
