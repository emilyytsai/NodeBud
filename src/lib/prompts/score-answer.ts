type ScoreContext = {
  question: string;
  targets: string[];
  transcript: string;
  stats: {
    posture_avg: number | null;
    eye_contact_pct: number | null;
    slouch_seconds: number;
    look_away_count: number;
    duration_seconds: number;
  } | null;
  roleTitle: string;
  seniority: string;
  accessibilityMode: boolean;
};

export const SCORE_ANSWER_SYSTEM = `You are an expert interview coach evaluating a candidate's answer. Score each dimension 1-10. Be specific in feedback, referencing what the candidate actually said. Return only valid JSON.`;

export function SCORE_ANSWER_USER(ctx: ScoreContext): string {
  const cvLine =
    ctx.accessibilityMode || !ctx.stats
      ? "(CV data not available — accessibility mode)"
      : `Posture average: ${ctx.stats.posture_avg ?? "N/A"}/100
Eye contact: ${ctx.stats.eye_contact_pct ?? "N/A"}%
Slouching: ${ctx.stats.slouch_seconds}s
Times looked away: ${ctx.stats.look_away_count}`;

  return `Role: ${ctx.roleTitle} (${ctx.seniority})
Question: ${ctx.question}
Competencies tested: ${ctx.targets.join(", ")}

Candidate's answer:
"${ctx.transcript || "(no answer given)"}"

Non-verbal signals:
${cvLine}

Score this answer. Return JSON with:
- scores: { content_relevance, technical_accuracy, structure, specificity, communication } — each 1-10
- overall: weighted average score 0-100
- strengths: array of 1-3 specific strengths (quote the candidate where possible)
- improvements: array of 1-3 specific improvements
- weak_competencies: array of competency names the candidate struggled with
- non_verbal_feedback: one sentence about posture/eye contact, or null if CV disabled
- memory_writeback: { competency, evidence, confidence } if there's a notable weak area, else null`;
}
