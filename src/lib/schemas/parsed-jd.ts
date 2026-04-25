import { z } from "zod";

export const ParsedJdSchema = z.object({
  role_title: z.string(),
  seniority: z.enum(["junior", "mid", "senior", "staff"]),
  role_type: z.enum(["frontend", "backend", "fullstack", "mobile", "data", "devops", "other"]),
  hard_skills: z.array(
    z.object({
      name: z.string(),
      required: z.boolean(),
      weight: z.number(),
    })
  ),
  soft_skills: z.array(z.string()),
  domain_keywords: z.array(z.string()),
  suggested_question_count: z.number().int(),
  confidence: z.number(),
});

export type ParsedJd = z.infer<typeof ParsedJdSchema>;

export const PARSED_JD_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    role_title: { type: "string" },
    seniority: { type: "string", enum: ["junior", "mid", "senior", "staff"] },
    role_type: {
      type: "string",
      enum: ["frontend", "backend", "fullstack", "mobile", "data", "devops", "other"],
    },
    hard_skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          required: { type: "boolean" },
          weight: { type: "number" },
        },
        required: ["name", "required", "weight"],
      },
    },
    soft_skills: { type: "array", items: { type: "string" } },
    domain_keywords: { type: "array", items: { type: "string" } },
    suggested_question_count: { type: "integer" },
    confidence: { type: "number" },
  },
  required: [
    "role_title",
    "seniority",
    "role_type",
    "hard_skills",
    "soft_skills",
    "domain_keywords",
    "suggested_question_count",
    "confidence",
  ],
};
