import { z } from "zod";
import { getGemmaModel } from "./llm";

type CallOpts<T> = {
  temperature?: number;
  maxRetries?: number;
  responseSchema?: object;
  fallback?: T;
};

export async function callGemmaJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  opts: CallOpts<T> = {}
): Promise<T> {
  const { temperature = 0.3, maxRetries = 1, responseSchema, fallback } = opts;
  const model = getGemmaModel({ responseSchema });
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const stricterSuffix =
        attempt > 0
          ? `\n\nPrevious response failed validation: ${String(lastError).slice(0, 200)}. Return ONLY valid JSON. No prose.`
          : "";

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}${stricterSuffix}` }],
          },
        ],
        generationConfig: { temperature },
      });

      const raw = result.response.text();
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (e) {
      lastError = e;
      attempt++;
      if (attempt > maxRetries) {
        if (fallback !== undefined) {
          console.warn("[callGemmaJSON] Falling back. Last error:", e);
          return fallback;
        }
        throw new Error(`Gemma call failed: ${String(e).slice(0, 300)}`);
      }
    }
  }
  throw new Error("unreachable");
}
