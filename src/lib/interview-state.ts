import type { InterviewQuestion } from "./schemas/interview-question";
import type { ScoredAnswer } from "./schemas/scored-answer";

export type InterviewStatus =
  | "loading_intro"
  | "speaking_question"
  | "awaiting_answer"
  | "scoring_answer"
  | "show_report";

export type InterviewState = {
  status: InterviewStatus;
  questionIndex: number;
  questions: InterviewQuestion[];
  answers: string[];
  scores: ScoredAnswer[];
};
