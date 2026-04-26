"use client";
import { ThinkingIndicator } from "./thinking-indicator";
import { AnswerInput } from "./answer-input";
import type { InterviewState } from "@/lib/interview-state";

interface QuestionPanelProps {
  state: InterviewState;
  onAnswerSubmit: (transcript: string) => void;
}

export function QuestionPanel({ state, onAnswerSubmit }: QuestionPanelProps) {
  const currentQ = state.questions[state.questionIndex];

  return (
    <div className="question-panel p-5">
      {/* Question */}
      <div className="flex-1">
        <div className="text-xs text-gray-400 mb-2">
          Question {state.questionIndex + 1}
          {currentQ && ` · ${currentQ.type.replace("_", " ")}`}
        </div>

        {currentQ ? (
          <p className="text-amber-100 text-base leading-relaxed">{currentQ.question}</p>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ThinkingIndicator /> Preparing question…
          </div>
        )}
      </div>

      {/* Status / Input */}
      <div>
        {state.status === "loading_intro" && !currentQ && null}

        {state.status === "speaking_question" && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ThinkingIndicator /> Speaking…
          </div>
        )}

        {state.status === "awaiting_answer" && (
          <AnswerInput onSubmit={onAnswerSubmit} />
        )}

        {state.status === "scoring_answer" && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ThinkingIndicator /> Evaluating your answer…
          </div>
        )}

        {state.status === "loading_intro" && currentQ && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ThinkingIndicator /> Loading next question…
          </div>
        )}
      </div>
    </div>
  );
}
