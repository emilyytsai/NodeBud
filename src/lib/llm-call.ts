import { z } from "zod";
import { getGemmaModel } from "./llm";

function extractJSON(text: string): string {
  // Strip markdown code fences
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();

  const trimmed = text.trim();

  // Walk forward to find the first { then track balanced braces to find the
  // exact end of the JSON object — this correctly handles trailing prose and
  // commentary that the model sometimes appends after the closing }.
  const start = trimmed.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\" && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return trimmed.slice(start, i + 1); }
    }
    return trimmed.slice(start);
  }

  return trimmed;
}

type CallOpts<T> = {
  temperature?: number;
  maxRetries?: number;
  responseSchema?: object;
  fallback?: T;
  model?: string;
};

export async function callGemmaJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  opts: CallOpts<T> = {}
): Promise<T> {
  const { temperature = 0.3, maxRetries = 1, responseSchema, fallback, model: modelOverride } = opts;
  const model = getGemmaModel({ responseSchema, model: modelOverride });
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
        // Must repeat responseMimeType here — generateContent config merges
        // inconsistently across SDK versions and can drop the model-level setting.
        generationConfig: { temperature },
      });

      const raw = extractJSON(result.response.text());
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
