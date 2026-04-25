import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY ?? "");

export const GEMMA_MODEL = process.env.GEMMA_MODEL_NAME ?? "gemma-2-9b-it";

export function getGemmaModel(opts: { responseSchema?: object } = {}) {
  return genAI.getGenerativeModel({
    model: GEMMA_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema as never } : {}),
      temperature: 0.3,
    },
  });
}
