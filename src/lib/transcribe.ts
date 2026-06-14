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
  casoId: string,
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

    // Import Supabase client
    const { supabase } = await import("./supabase");

    onProgress({
      status: "uploading",
      progress: 20,
      message: "Subiendo video a almacenamiento...",
    });

    // Upload to Supabase Storage
    const fileName = `${casoId}/${Date.now()}-${file.name}`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("videos")
      .upload(fileName, file, { upsert: false });

    if (uploadError || !uploadData) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Error al subir video",
        error: uploadError?.message || "Error desconocido",
      });
      return null;
    }

    onProgress({
      status: "processing",
      progress: 40,
      message: "Iniciando transcripción con Whisper...",
    });

    // Call Supabase Edge Function
    const { data: funcData, error: funcError } = await supabase.functions.invoke(
      "transcribe-video",
      {
        body: { videoPath: fileName, casoId },
      },
    );

    if (funcError || !funcData) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Error al transcribir",
        error: funcError?.message || "Error en Edge Function",
      });
      return null;
    }

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

    return {
      id: funcData.documentId || `transcription-${Date.now()}`,
      fileName: file.name,
      duration: 0,
      transcription: funcData.transcription,
      language: "es-MX",
      createdAt: Date.now(),
    };
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
