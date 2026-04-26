import { callGemmaJSON } from "@/lib/llm-call";
import { ScoredAnswerSchema, SCORED_ANSWER_RESPONSE_SCHEMA } from "@/lib/schemas/scored-answer";
import { SCORE_ANSWER_SYSTEM, SCORE_ANSWER_USER } from "@/lib/prompts/score-answer";

const SCORE_FALLBACK = {
  scores: {
    content_relevance: 5,
    technical_accuracy: 5,
    structure: 5,
    specificity: 5,
    communication: 5,
  },
  overall: 50,
  strengths: ["You completed the question."],
  improvements: ["Try to give a more specific example next time."],
  weak_competencies: [],
  non_verbal_feedback: null,
  memory_writeback: null,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const scored = await callGemmaJSON(
      SCORE_ANSWER_SYSTEM,
      SCORE_ANSWER_USER(body),
      ScoredAnswerSchema,
      {
        responseSchema: SCORED_ANSWER_RESPONSE_SCHEMA,
        maxRetries: 1,
        fallback: SCORE_FALLBACK,
      }
    );

    return Response.json(scored);
  } catch (e) {
    return Response.json(SCORE_FALLBACK);
  }
}
