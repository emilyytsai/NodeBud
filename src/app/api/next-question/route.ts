import { callGemmaJSON } from "@/lib/llm-call";
import {
  InterviewQuestionSchema,
  INTERVIEW_QUESTION_RESPONSE_SCHEMA,
} from "@/lib/schemas/interview-question";
import { NEXT_QUESTION_SYSTEM, NEXT_QUESTION_USER } from "@/lib/prompts/next-question";
import fallbackQuestions from "@/lib/fallback-questions.json";
import type { PersonaId } from "@/lib/personas";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { parsedJd, persona, questionIndex = 0, previousQuestions = [] } = body;

    if (!parsedJd || !persona) {
      return Response.json(
        { error: "parsedJd and persona are required" },
        { status: 400 }
      );
    }

    const fallback =
      fallbackQuestions[questionIndex % fallbackQuestions.length];

    const question = await callGemmaJSON(
      NEXT_QUESTION_SYSTEM,
      NEXT_QUESTION_USER({
        parsedJd,
        persona: persona as PersonaId,
        questionIndex,
        previousQuestions,
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
