// 100% client-side video/audio → text. The media never leaves the browser:
// we decode its audio with the native Web Audio API, then transcribe it locally
// with Whisper (WASM) in a Web Worker. Only the resulting text is persisted.

export interface TranscriptionProgress {
  status: "extracting" | "downloading" | "transcribing" | "complete" | "error";
  progress: number; // 0–100
  message: string;
  partialText?: string; // transcript streamed so far
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
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (ponytail: client-side decode may hit
// browser memory limits well before this on multi-hour files — no streaming demux here)
const SAMPLE_RATE = 16000; // Whisper expects 16kHz mono PCM
const CHUNK_SECONDS = 30; // Whisper's native window

export function isVideoFile(file: File): boolean {
  return SUPPORTED_FORMATS.includes(file.type) || /\.(mp4|mov|mkv|webm|m4a|mp3|wav|ogg)$/i.test(file.name);
}

export function getVideoExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "mp4";
}

/** Decode any browser-supported media file to 16kHz mono PCM via the native decoder. */
async function decodePcm16k(file: File): Promise<Float32Array> {
  const buf = await file.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: SAMPLE_RATE });
  try {
    const audio = await ctx.decodeAudioData(buf);
    if (audio.numberOfChannels === 1) return audio.getChannelData(0).slice();
    // Mix down to mono.
    const a = audio.getChannelData(0);
    const b = audio.getChannelData(1);
    const mono = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) mono[i] = (a[i] + b[i]) / 2;
    return mono;
  } finally {
    void ctx.close();
  }
}

const mmss = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export async function transcribeVideo(
  file: File,
  _casoId: string,
  onProgress: (progress: TranscriptionProgress) => void,
): Promise<VideoTranscription | null> {
  try {
    if (!isVideoFile(file)) {
      onProgress({ status: "error", progress: 0, message: "Formato no soportado", error: "Usa MP4, MOV, MKV, WEBM o audio (m4a/mp3/wav)." });
      return null;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      onProgress({ status: "error", progress: 0, message: "Archivo demasiado grande", error: "El máximo es 2 GB." });
      return null;
    }

    onProgress({ status: "extracting", progress: 0, message: "Extrayendo audio del video (local)…" });
    let pcm: Float32Array;
    try {
      pcm = await decodePcm16k(file);
    } catch {
      onProgress({
        status: "error",
        progress: 0,
        message: "No pude extraer el audio en el navegador",
        error: "El decodificador nativo no soporta este contenedor. Prueba MP4, MOV o WEBM.",
      });
      return null;
    }

    const worker = new Worker(new URL("./transcribe.worker.ts", import.meta.url), { type: "module" });
    const chunkSamples = SAMPLE_RATE * CHUNK_SECONDS;
    const total = Math.max(1, Math.ceil(pcm.length / chunkSamples));
    const parts: string[] = [];

    const transcript = await new Promise<string>((resolve, reject) => {
      let i = 0;
      const sendNext = () => {
        if (i >= total) return resolve(parts.join("\n").trim());
        const slice = pcm.slice(i * chunkSamples, (i + 1) * chunkSamples);
        worker.postMessage({ audio: slice, index: i }, [slice.buffer]);
      };
      worker.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "model") {
          onProgress({
            status: "downloading",
            progress: m.progress,
            message: "Descargando motor de transcripción local (solo la primera vez)…",
          });
        } else if (m.type === "chunk") {
          if (m.text) parts.push(`[${mmss(m.index * CHUNK_SECONDS)}] ${m.text}`);
          i++;
          const pct = Math.round((i / total) * 100);
          onProgress({
            status: "transcribing",
            progress: pct,
            message: `Procesando audio localmente: ${pct}% completado…`,
            partialText: parts.join("\n"),
          });
          sendNext();
        } else if (m.type === "error") {
          reject(new Error(m.error));
        }
      };
      worker.onerror = (err) => reject(err.error ?? new Error("Error en el worker de transcripción"));
      sendNext();
    });

    worker.terminate();
    onProgress({ status: "complete", progress: 100, message: "¡Transcripción local completada!", partialText: transcript });
    return {
      id: `transcription-${Date.now()}`,
      fileName: file.name,
      duration: Math.round(pcm.length / SAMPLE_RATE),
      transcription: transcript,
      language: "es-MX",
      createdAt: Date.now(),
    };
  } catch (error) {
    onProgress({
      status: "error",
      progress: 0,
      message: "Error durante la transcripción",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
