/// <reference lib="webworker" />
// Local Whisper (WASM) transcription worker. The main thread feeds it 30s PCM
// chunks; this never touches the network except to fetch the model once.
// ponytail: one worker, one model, transcribe-a-chunk. No internal chunking.
import { pipeline, env, type AutomaticSpeechRecognitionPipeline } from "@xenova/transformers";

env.allowLocalModels = false; // pull the quantized model from the HF hub (cached after the first run)

// ponytail: whisper-base = solid Spanish at a modest size. Swap to
// "Xenova/whisper-tiny" for a lighter/faster first download (lower accuracy).
const MODEL = "Xenova/whisper-base";

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
function getAsr() {
  if (!asr) {
    asr = pipeline("automatic-speech-recognition", MODEL, {
      quantized: true,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p.status === "progress") {
          self.postMessage({ type: "model", progress: Math.round(p.progress ?? 0) });
        }
      },
    });
  }
  return asr;
}

self.onmessage = async (e: MessageEvent<{ audio: Float32Array; index: number }>) => {
  const { audio, index } = e.data;
  try {
    const transcribe = await getAsr();
    const out = await transcribe(audio, { language: "spanish", task: "transcribe" });
    const text = (Array.isArray(out) ? out[0]?.text : out?.text) ?? "";
    self.postMessage({ type: "chunk", index, text: text.trim() });
  } catch (err) {
    self.postMessage({ type: "error", error: err instanceof Error ? err.message : String(err) });
  }
};
