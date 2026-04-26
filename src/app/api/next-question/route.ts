import { callGemmaJSON } from "@/lib/llm-call";
import {
  InterviewQuestionSchema,
  INTERVIEW_QUESTION_RESPONSE_SCHEMA,
} from "@/lib/schemas/interview-question";
import { NEXT_QUESTION_SYSTEM, NEXT_QUESTION_USER } from "@/lib/prompts/next-question";
import fallbackQuestions from "@/lib/fallback-questions.json";
import type { PersonaId } from "@/lib/personas";
import { DIFFICULTIES, DEFAULT_DIFFICULTY, type DifficultyId } from "@/lib/difficulty";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { parsedJd, persona, questionIndex = 0, previousQuestions = [], difficulty } = body;

    if (!parsedJd || !persona) {
      return Response.json(
        { error: "parsedJd and persona are required" },
        { status: 400 }
      );
    }

    const safeDifficulty: DifficultyId =
      typeof difficulty === "string" && difficulty in DIFFICULTIES
        ? (difficulty as DifficultyId)
        : DEFAULT_DIFFICULTY;

    const fallback =
      fallbackQuestions[questionIndex % fallbackQuestions.length];

    const question = await callGemmaJSON(
      NEXT_QUESTION_SYSTEM,
      NEXT_QUESTION_USER({
        parsedJd,
        persona: persona as PersonaId,
        questionIndex,
        previousQuestions,
        difficulty: safeDifficulty,
      }),
      InterviewQuestionSchema,
      {
        responseSchema: INTERVIEW_QUESTION_RESPONSE_SCHEMA,
        fallback,
      }
    );

    return Response.json(question);
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}
