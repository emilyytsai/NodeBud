import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";
import { PERSONAS } from "@/lib/personas";

type NextQuestionContext = {
  parsedJd: ParsedJd;
  persona: PersonaId;
  questionIndex: number;
  previousQuestions: string[];
};

export const NEXT_QUESTION_SYSTEM = `You are conducting a job interview. Generate one focused interview question based on the role requirements and interview context. Return only valid JSON. Never repeat a previous question.`;

export function NEXT_QUESTION_USER(ctx: NextQuestionContext): string {
  const persona = PERSONAS[ctx.persona];
  const skills = ctx.parsedJd.hard_skills
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((s) => s.name)
    .join(", ");

  const previousList =
    ctx.previousQuestions.length > 0
      ? `\nPrevious questions asked (do not repeat):\n${ctx.previousQuestions
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}`
      : "";

  return `Role: ${ctx.parsedJd.role_title} (${ctx.parsedJd.seniority})
Top skills required: ${skills}
Interview style: ${persona.systemTone}
Question number: ${ctx.questionIndex + 1} of ${ctx.parsedJd.suggested_question_count}
${previousList}

Generate question number ${ctx.questionIndex + 1}. Return JSON with:
- question: the interview question text
- targets: array of competency names this question assesses
- type: one of "behavioral", "technical", "system_design"`;
}
