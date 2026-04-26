import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY ?? "");

// Primary model for question generation + scoring (the AI showcase features).
export const GEMMA_MODEL = process.env.GEMMA_MODEL_NAME ?? "gemma-3-4b-it";


export function getGemmaModel(opts: { model?: string; responseSchema?: object } = {}) {
  return genAI.getGenerativeModel({
    model: opts.model ?? GEMMA_MODEL,
    generationConfig: {
      temperature: 0.3,
    },
  });
}
