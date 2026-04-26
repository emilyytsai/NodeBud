import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY ?? "");

// Primary model for question generation + scoring (the AI showcase features).
export const GEMMA_MODEL = process.env.GEMMA_MODEL_NAME ?? "gemma-4-26b-a4b-it";

// Fast model for structured extraction tasks (JD parsing). Gemini Flash
// reliably honours responseMimeType; Gemma 4 MoE does not.
export const FLASH_MODEL = process.env.FLASH_MODEL_NAME ?? "gemini-2.0-flash-lite";

export function getGemmaModel(opts: { model?: string; responseSchema?: object } = {}) {
  return genAI.getGenerativeModel({
    model: opts.model ?? GEMMA_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema as never } : {}),
      temperature: 0.3,
    },
  });
}
