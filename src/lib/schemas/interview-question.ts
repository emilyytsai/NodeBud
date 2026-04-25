import { z } from "zod";

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  targets: z.array(z.string()),
  type: z.enum(["behavioral", "technical", "system_design"]),
});

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const INTERVIEW_QUESTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    targets: { type: "array", items: { type: "string" } },
    type: { type: "string", enum: ["behavioral", "technical", "system_design"] },
  },
  required: ["question", "targets", "type"],
};
