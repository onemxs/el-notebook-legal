export interface TranscriptionProgress {
  status: "uploading" | "processing" | "transcribing" | "formatting" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface VideoTranscription {
  id: string;
  fileName: string;
  duration: number; // seconds
  transcription: string; // with timestamps [HH:MM:SS] format
  language: string; // "es-MX"
  createdAt: number;
}

const SUPPORTED_FORMATS = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"];
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export function isVideoFile(file: File): boolean {
  return SUPPORTED_FORMATS.includes(file.type) || /\.(mp4|mov|mkv|webm)$/i.test(file.name);
}

export function getVideoExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "mp4";
}

export async function transcribeVideo(
  file: File,
  onProgress: (progress: TranscriptionProgress) => void,
): Promise<VideoTranscription | null> {
  try {
    if (!isVideoFile(file)) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Formato de video no soportado",
        error: "Solo se permiten .mp4, .mov, .mkv, .webm",
      });
      return null;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Video demasiado grande",
        error: "El máximo es 2 GB",
      });
      return null;
    }

    onProgress({
      status: "uploading",
      progress: 10,
      message: "Preparando video para transcripción...",
    });

    const formData = new FormData();
    formData.append("video", file);

    const response = await fetch("/api/transcribe-video", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      onProgress({
        status: "error",
        progress: 0,
        message: "Error al procesar video",
        error: error || "Error desconocido del servidor",
      });
      return null;
    }

    onProgress({
      status: "transcribing",
      progress: 50,
      message: "Transcribiendo audio... Esto puede tomar unos minutos",
    });

    const result = (await response.json()) as VideoTranscription;

    onProgress({
      status: "formatting",
      progress: 90,
      message: "Formateando transcripción con timestamps...",
    });

    onProgress({
      status: "complete",
      progress: 100,
      message: "¡Transcripción completada!",
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onProgress({
      status: "error",
      progress: 0,
      message: "Error durante la transcripción",
      error: msg,
    });
    return null;
  }
}
