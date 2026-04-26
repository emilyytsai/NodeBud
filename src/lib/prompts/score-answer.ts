import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";

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
  verbalStats?: VerbalStatsResult | null;
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

  const verbalLine = ctx.verbalStats
    ? `Filler words: ${ctx.verbalStats.filler_word_count}${
        ctx.verbalStats.filler_words_found.length > 0
          ? ` (${ctx.verbalStats.filler_words_found.join(", ")})`
          : ""
      }
Acoustic hesitations (um/uh): ${ctx.verbalStats.acoustic_hesitation_count}
Speaking pace: ${ctx.verbalStats.wpm > 0 ? `${ctx.verbalStats.wpm} WPM` : "unavailable"} (ideal: 120–160 WPM for interviews)
Long pauses (>2s): ${ctx.verbalStats.long_pause_count}`
    : "(Verbal data not available)";

  return `Role: ${ctx.roleTitle} (${ctx.seniority})
Question: ${ctx.question}
Competencies tested: ${ctx.targets.join(", ")}

Candidate's answer:
"${ctx.transcript || "(no answer given)"}"

Non-verbal signals:
${cvLine}

Verbal delivery signals:
${verbalLine}

Score this answer. Return JSON with:
- scores: { content_relevance, technical_accuracy, structure, specificity, communication, verbal_delivery } — each 1-10
  verbal_delivery rubric: 9-10 = fluent, confident pace (120-160 WPM), ≤2 fillers, no freezes; 6-8 = minor filler use or slight pace issues; 3-5 = noticeable fillers or pace problems; 1-2 = heavy fillers, erratic pace, or frequent freezes
- overall: weighted average score 0-100
- strengths: array of 1-3 specific strengths (quote the candidate where possible)
- improvements: array of 1-3 specific improvements
- weak_competencies: array of competency names the candidate struggled with
- non_verbal_feedback: one sentence about posture/eye contact, or null if CV disabled
- verbal_feedback: one sentence referencing specific verbal delivery numbers (e.g. filler count, WPM), or null if verbal data unavailable
- memory_writeback: { competency, evidence, confidence } if there's a notable weak area, else null`;
}
