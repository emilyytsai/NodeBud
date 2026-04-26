import { callGemmaJSON } from "@/lib/llm-call";
import { FLASH_MODEL } from "@/lib/llm";
import { ParsedJdSchema, PARSED_JD_RESPONSE_SCHEMA } from "@/lib/schemas/parsed-jd";
import { PARSE_JD_SYSTEM, PARSE_JD_USER } from "@/lib/prompts/parse-jd";

export async function POST(req: Request) {
  try {
    const { jdText } = await req.json();
    if (!jdText || typeof jdText !== "string" || jdText.length < 50) {
      return Response.json(
        { error: "Job description must be at least 50 characters." },
        { status: 400 }
      );
    }

    const parsed = await callGemmaJSON(
      PARSE_JD_SYSTEM,
      PARSE_JD_USER(jdText),
      ParsedJdSchema,
      {
        model: FLASH_MODEL,
        responseSchema: PARSED_JD_RESPONSE_SCHEMA,
        maxRetries: 2,
        fallback: {
          role_title: "Software Engineer",
          seniority: "junior" as const,
          role_type: "fullstack" as const,
          hard_skills: [
            { name: "JavaScript", required: true, weight: 0.8 },
            { name: "Problem solving", required: true, weight: 1.0 },
          ],
          soft_skills: ["Communication", "Teamwork"],
          domain_keywords: [],
          suggested_question_count: 4,
          confidence: 0.3,
        },
      }
    );

    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}
