"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ScoredAnswer } from "@/lib/schemas/scored-answer";
import type { InterviewQuestion } from "@/lib/schemas/interview-question";
import type { PersonaId } from "@/lib/personas";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
import { saveSession } from "@/lib/session-store";

interface ScoreReportProps {
  questions: InterviewQuestion[];
  answers: string[];
  scores: ScoredAnswer[];
  verbalStatsList?: (VerbalStatsResult | null)[];
  roleTitle: string;
  persona: PersonaId;
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{Math.round(pct / 10)}</span>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const color = value >= 70 ? "text-green-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className={`text-5xl font-bold ${color}`}>{value}</div>
  );
}

export function ScoreReport({ questions, answers, scores, verbalStatsList, roleTitle, persona }: ScoreReportProps) {
  void answers;
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const overallAvg =
    scores.length > 0
      ? Math.round(scores.reduce((s, r) => s + r.overall, 0) / scores.length)
      : 0;

  const overallColor = overallAvg >= 70 ? "text-green-400" : overallAvg >= 40 ? "text-amber-400" : "text-red-400";
  const overallLabel = overallAvg >= 70 ? "Great job!" : overallAvg >= 40 ? "Good effort!" : "Keep practicing!";

  const handleSave = () => {
    if (saved) return;
    const weakSet = new Set<string>();
    scores.forEach((s) => s.weak_competencies.forEach((c) => weakSet.add(c)));
    saveSession({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}`,
      date: new Date().toISOString(),
      role_title: roleTitle,
      persona,
      overall_score: overallAvg,
      weak_competencies: Array.from(weakSet),
      questions: scores.map((s, i) => ({
        question: questions[i]?.question ?? "",
        overall: s.overall,
        strengths: s.strengths,
        improvements: s.improvements,
      })),
    });
    setSaved(true);
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      <div className="glass-input rounded-2xl border border-white/20 p-8 text-center space-y-3 relative overflow-hidden">
        <div className="flex justify-center mb-2">
        </div>
        <h2 className="setup-title">Interview Complete</h2>
        <p className="text-gray-400 text-sm">{overallLabel}</p>
        <div className={`text-7xl font-bold ${overallColor}`}>{overallAvg}</div>
        <div className="text-gray-400 text-sm">Overall Score / 100</div>

        <div className="max-w-xs mx-auto pt-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallAvg >= 70 ? "bg-green-400" : overallAvg >= 40 ? "bg-amber-400" : "bg-red-400"
              }`}
              style={{ width: `${overallAvg}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-question */}
      {scores.map((score, i) => (
        <div key={i} className="glass-input rounded-2xl border border-white/20 p-6 space-y-4">

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Question {i + 1}</div>
              <p className="text-amber-100 text-sm leading-relaxed">{questions[i]?.question}</p>
            </div>
            <div className="text-right shrink-0">
              <ScoreRing value={score.overall} />
              <div className="text-xs text-gray-500 mt-0.5">/ 100</div>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Dimension scores */}
          <div className="space-y-2">
            {Object.entries(score.scores).map(([dim, val]) => (
              <div key={dim} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-36 capitalize shrink-0">{dim.replace(/_/g, " ")}</span>
                <ScoreBar value={(val as number) * 10} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {score.strengths.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-green-400 flex items-center gap-1">
                  ✓ Strengths
                </div>
                <ul className="space-y-1">
                  {score.strengths.map((s, j) => (
                    <li key={j} className="text-xs text-gray-300 leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {score.improvements.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  ↑ To improve
                </div>
                <ul className="space-y-1">
                  {score.improvements.map((imp, j) => (
                    <li key={j} className="text-xs text-gray-300 leading-relaxed">• {imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {score.non_verbal_feedback && (
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs font-semibold text-blue-400 mb-1">Body language</div>
              <p className="text-xs text-gray-400 italic leading-relaxed">
                {score.non_verbal_feedback}
              </p>
            </div>
          )}

          {score.verbal_feedback && (
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs font-semibold text-purple-400 mb-1">Verbal delivery</div>
              {verbalStatsList?.[i] && (
                <p className="text-xs text-gray-500 mb-1">
                  {verbalStatsList[i]!.filler_word_count} filler word{verbalStatsList[i]!.filler_word_count !== 1 ? "s" : ""}
                  {verbalStatsList[i]!.filler_words_found.length > 0
                    ? ` (${verbalStatsList[i]!.filler_words_found.join(", ")})`
                    : ""}
                  {" · "}
                  {verbalStatsList[i]!.wpm > 0 ? `${verbalStatsList[i]!.wpm} WPM` : "pace unavailable"}
                  {" · "}
                  {verbalStatsList[i]!.long_pause_count} long pause{verbalStatsList[i]!.long_pause_count !== 1 ? "s" : ""}
                </p>
              )}
              <p className="text-xs text-gray-400 italic leading-relaxed">{score.verbal_feedback}</p>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-3 pb-4">
        <div className="btn-wrapper">
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="btn-primary block text-center w-full"
          >
            {saved ? "Saved" : "Save session"}
          </button>
        </div>
        <div className="text-center">
          <Link
            href="/setup"
            className="text-sm text-gray-400 hover:text-amber-100 underline-offset-4 hover:underline transition-colors"
          >
            Start a new interview →
          </Link>
        </div>
      </div>

    </div>
  );
}