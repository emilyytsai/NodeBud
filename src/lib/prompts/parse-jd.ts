export const PARSE_JD_SYSTEM = `You are a technical job description parser. Extract structured information from job descriptions. Return only valid JSON matching the requested schema. Be precise with skill weights (0.0 to 1.0). If the JD is vague, still return a best-effort parse with low confidence.`;

export function PARSE_JD_USER(jdText: string): string {
  return `Parse this job description and return structured information:

${jdText}

Return JSON with:
- role_title: the job title
- seniority: one of "junior", "mid", "senior", "staff"
- role_type: one of "frontend", "backend", "fullstack", "mobile", "data", "devops", "other"
- hard_skills: array of { name, required (bool), weight (0.0-1.0 importance) }
- soft_skills: array of skill names
- domain_keywords: array of domain-specific terms from the JD
- suggested_question_count: integer between 3 and 5
- confidence: float 0.0-1.0 (how well-defined the JD was)`;
}
