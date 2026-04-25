import { z } from "zod";

export const ScoredAnswerSchema = z.object({
  scores: z.object({
    content_relevance: z.number(),
    technical_accuracy: z.number(),
    structure: z.number(),
    specificity: z.number(),
    communication: z.number(),
  }),
  overall: z.number(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  weak_competencies: z.array(z.string()),
  non_verbal_feedback: z.string().nullable(),
  memory_writeback: z
    .object({
      competency: z.string(),
      evidence: z.string(),
      confidence: z.number(),
    })
    .nullable(),
});

export type ScoredAnswer = z.infer<typeof ScoredAnswerSchema>;

export const SCORED_ANSWER_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        content_relevance: { type: "number" },
        technical_accuracy: { type: "number" },
        structure: { type: "number" },
        specificity: { type: "number" },
        communication: { type: "number" },
      },
      required: [
        "content_relevance",
        "technical_accuracy",
        "structure",
        "specificity",
        "communication",
      ],
    },
    overall: { type: "number" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    weak_competencies: { type: "array", items: { type: "string" } },
    non_verbal_feedback: { type: "string", nullable: true },
    memory_writeback: {
      type: "object",
      nullable: true,
      properties: {
        competency: { type: "string" },
        evidence: { type: "string" },
        confidence: { type: "number" },
      },
    },
  },
  required: ["scores", "overall", "strengths", "improvements", "weak_competencies"],
};
