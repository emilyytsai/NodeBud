"use client";
import Link from "next/link";
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
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{Math.round(pct / 10)}</span>
    </div>
  );
}

export function ScoreReport({ questions, answers, scores }: ScoreReportProps) {
  const overallAvg =
    scores.length > 0
      ? Math.round(scores.reduce((s, r) => s + r.overall, 0) / scores.length)
      : 0;

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="glass-input rounded-xl border border-white/20 p-6 text-center space-y-1">
        <h2 className="setup-title">Interview Complete</h2>
        <div className="text-6xl font-bold text-amber-100">{overallAvg}</div>
        <div className="text-gray-400 text-sm">Overall Score / 100</div>
      </div>

      {/* Per-question */}
      {scores.map((score, i) => (
        <div key={i} className="glass-input rounded-xl border border-white/20 p-5 space-y-3">
          <div className="text-xs text-gray-400">Question {i + 1}</div>
          <p className="text-amber-100 text-sm leading-relaxed">{questions[i]?.question}</p>

          {/* Dimension scores */}
          <div className="space-y-1.5">
            {Object.entries(score.scores).map(([dim, val]) => (
              <div key={dim} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-32 capitalize">{dim.replace(/_/g, " ")}</span>
                <ScoreBar value={(val as number) * 10} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-2xl font-bold text-amber-100">{score.overall}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>

          {score.strengths.length > 0 && (
            <div>
              <div className="text-xs text-green-400 mb-1">Strengths</div>
              <ul className="space-y-0.5">
                {score.strengths.map((s, j) => (
                  <li key={j} className="text-sm text-gray-300">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {score.improvements.length > 0 && (
            <div>
              <div className="text-xs text-amber-400 mb-1">To improve</div>
              <ul className="space-y-0.5">
                {score.improvements.map((imp, j) => (
                  <li key={j} className="text-sm text-gray-300">• {imp}</li>
                ))}
              </ul>
            </div>
          )}

          {score.non_verbal_feedback && (
            <p className="text-sm text-gray-400 italic border-t border-white/10 pt-2">
              {score.non_verbal_feedback}
            </p>
          )}
        </div>
      ))}

      <div className="btn-wrapper">
        <Link href="/setup" className="btn-primary block text-center">
          Start New Interview
        </Link>
      </div>
    </div>
  );
}
