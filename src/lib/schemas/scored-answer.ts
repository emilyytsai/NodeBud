import { z } from "zod";

export const ScoredAnswerSchema = z.object({
  scores: z.object({
    content_relevance: z.coerce.number().catch(5),
    technical_accuracy: z.coerce.number().catch(5),
    structure: z.coerce.number().catch(5),
    specificity: z.coerce.number().catch(5),
    communication: z.coerce.number().catch(5),
    verbal_delivery: z.coerce.number().catch(5),
  }),
  overall: z.coerce.number().catch(50),
  strengths: z.array(z.string()).catch([]),
  improvements: z.array(z.string()).catch([]),
  weak_competencies: z.array(z.string()).catch([]),
  non_verbal_feedback: z.string().nullish().catch(null),
  verbal_feedback: z.string().nullish().catch(null),
  memory_writeback: z
    .object({
      competency: z.string(),
      evidence: z.string(),
      confidence: z.coerce.number(),
    })
    .nullable()
    .catch(null),
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
        verbal_delivery: { type: "number" },
      },
      required: [
        "content_relevance",
        "technical_accuracy",
        "structure",
        "specificity",
        "communication",
        "verbal_delivery",
      ],
    },
    overall: { type: "number" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    weak_competencies: { type: "array", items: { type: "string" } },
    non_verbal_feedback: { type: "string", nullable: true },
    verbal_feedback: { type: "string", nullable: true },
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
