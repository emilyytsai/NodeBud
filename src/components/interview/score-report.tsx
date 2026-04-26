"use client";
import Link from "next/link";
import Image from "next/image";
import type { ScoredAnswer } from "@/lib/schemas/scored-answer";
import type { InterviewQuestion } from "@/lib/schemas/interview-question";

interface ScoreReportProps {
  questions: InterviewQuestion[];
  answers: string[];
  scores: ScoredAnswer[];
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

export function ScoreReport({ questions, answers, scores }: ScoreReportProps) {
  const overallAvg =
    scores.length > 0
      ? Math.round(scores.reduce((s, r) => s + r.overall, 0) / scores.length)
      : 0;

  const overallColor = overallAvg >= 70 ? "text-green-400" : overallAvg >= 40 ? "text-amber-400" : "text-red-400";
  const overallLabel = overallAvg >= 70 ? "Great job!" : overallAvg >= 40 ? "Good effort!" : "Keep practicing!";

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
        </div>
      ))}

      <div className="btn-wrapper pb-4">
        <Link href="/setup" className="btn-primary block text-center">
          Start New Interview
        </Link>
      </div>

    </div>
  );
}