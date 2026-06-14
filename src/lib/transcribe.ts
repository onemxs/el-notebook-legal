import type { BranchId } from "./types";
import { createClient } from "@supabase/supabase-js";

export interface TranscriptionProgress {
  status: "uploading" | "processing" | "transcribing" | "formatting" | "complete" | "error";
  progress: number;
  message: string;
  error?: string;
}

export interface VideoTranscription {
  id: string;
  fileName: string;
  duration: number;
  transcription: string;
  language: string;
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

    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Supabase no configurado",
        error: "Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY",
      });
      return null;
    }

    const supabase = createClient(url, anonKey);

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
      console.error("Upload error:", uploadError);
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

    if (funcError) {
      console.error("Edge Function error:", funcError);
      onProgress({
        status: "error",
        progress: 0,
        message: "Error al transcribir",
        error: funcError?.message || "Error en Edge Function",
      });
      return null;
    }

    if (!funcData) {
      onProgress({
        status: "error",
        progress: 0,
        message: "Sin respuesta de Edge Function",
        error: "La función no retornó datos",
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
    console.error("Transcribe error:", msg);
    onProgress({
      status: "error",
      progress: 0,
      message: "Error durante la transcripción",
      error: msg,
    });
    return null;
  }
}
