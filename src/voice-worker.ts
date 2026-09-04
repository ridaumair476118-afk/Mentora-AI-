/* Offline speech-to-text worker — Whisper running locally in the browser
   via transformers.js. Used as an automatic fallback when Chrome's built-in
   Web Speech service is unreachable (its "network" error), so voice input
   keeps working regardless. The model is downloaded once from the public
   HuggingFace CDN and cached by the browser afterwards. No API key, no paid
   service — everything runs on the student's own device. */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false; /* model files come from the HF CDN, not /models/ */

type TranscribeMessage = { type: "transcribe"; audio: Float32Array; language: string };

/* Minimal worker-scope typing (lib.dom types self as Window). */
type WorkerCtx = {
  onmessage: ((e: MessageEvent<TranscribeMessage>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage: (msg: unknown) => void;
};
const ctx = self as unknown as WorkerCtx;

type AsrPipeline = (audio: Float32Array, opts: { language: string; task: string }) => Promise<{ text: string }>;
let asr: AsrPipeline | null = null;

/* Whisper "tiny" (multilingual, q8-quantised): ~40 MB one-time download,
   transcribes a few seconds of speech in a few seconds on CPU. */
const MODEL_ID = "onnx-community/whisper-tiny";

ctx.onmessage = async (e) => {
  const { type, audio, language } = e.data;
  if (type !== "transcribe" || !audio) return;
  try {
    if (!asr) {
      let lastPct = -1;
      asr = await pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "q8",
        /* onnxruntime-web's default graph optimizer breaks on this export's
           merged quantisation scales ("TransposeDQWeightsForMatMulNBits:
           Missing required scale") — disabling optimisation fixes session
           creation and costs little for this tiny model. */
        session_options: { graphOptimizationLevel: "disabled" },
        progress_callback: (p: { status?: string; loaded?: number; total?: number }) => {
          if (p.status === "progress" && p.total) {
            const pct = Math.min(99, Math.round(((p.loaded ?? 0) / p.total) * 100));
            if (pct > lastPct) { lastPct = pct; ctx.postMessage({ type: "loading", pct }); }
          }
        },
      }) as unknown as AsrPipeline;
      ctx.postMessage({ type: "loaded" });
    }
    ctx.postMessage({ type: "transcribing" });
    const output = await asr(audio, { language: language === "ur" ? "urdu" : "english", task: "transcribe" });
    ctx.postMessage({ type: "result", text: (output && output.text) || "" });
  } catch (err) {
    asr = null; /* allow a clean retry next time */
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
