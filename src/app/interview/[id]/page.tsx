"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PermissionsGate } from "@/components/interview/permissions-gate";
import { WebcamView } from "@/components/interview/webcam-view";
import { ConfidenceGauges } from "@/components/interview/confidence-gauges";
import { QuestionPanel } from "@/components/interview/question-panel";
import { ScoreReport } from "@/components/interview/score-report";
import { useTTS } from "@/components/interview/audio-player";
import { QuestionStats } from "@/lib/scoring/question-stats";
import type { InterviewState } from "@/lib/interview-state";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";
import { PERSONAS } from "@/lib/personas";

const TrackingLoop = dynamic(
  () => import("@/components/interview/tracking-loop"),
  { ssr: false }
);

const MAX_QUESTIONS = 5;

const SCORE_FALLBACK = {
  scores: { content_relevance: 5, technical_accuracy: 5, structure: 5, specificity: 5, communication: 5 },
  overall: 50,
  strengths: ["You completed the question."],
  improvements: ["Try to give a more specific example next time."],
  weak_competencies: [],
  non_verbal_feedback: null,
  memory_writeback: null,
};

type SetupPayload = {
  jdText: string;
  persona: PersonaId;
  parsed: ParsedJd | null;
};

const INITIAL_STATE: InterviewState = {
  status: "loading_intro",
  questionIndex: 0,
  questions: [],
  answers: [],
  scores: [],
};

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cvDisabled, setCvDisabled] = useState(false);
  const [ttsMode, setTtsMode] = useState<"elevenlabs" | "browser">("elevenlabs");
  const [posture, setPosture] = useState(100);
  const [eyeContact, setEyeContact] = useState(100);
  const [istate, setIstate] = useState<InterviewState>(INITIAL_STATE);

  const videoRef = useRef<HTMLVideoElement>(null);
  const questionStatsRef = useRef(new QuestionStats());
  const fetchGuardRef = useRef(-1);
  const speakGuardRef = useRef(-1);
  const scoreGuardRef = useRef(-1);

  const { speak } = useTTS(setup?.persona ?? "encouraging_recruiter", ttsMode);

  // Restore setup + state from sessionStorage; read URL flags
  useEffect(() => {
    const saved = sessionStorage.getItem(`session:${sessionId}:setup`);
    if (saved) setSetup(JSON.parse(saved));

    const search = new URLSearchParams(window.location.search);
    setCvDisabled(search.get("cv") === "off");
    if (search.get("tts") === "browser") setTtsMode("browser");

    const savedState = sessionStorage.getItem(`session:${sessionId}:state`);
    if (savedState) {
      try { setIstate(JSON.parse(savedState)); } catch { /* ignore */ }
    }
  }, [sessionId]);

  // Mirror state to sessionStorage (skip pure initial state to avoid clobbering a restored save)
  useEffect(() => {
    if (istate.questionIndex === 0 && istate.status === "loading_intro" && istate.questions.length === 0) return;
    sessionStorage.setItem(`session:${sessionId}:state`, JSON.stringify(istate));
  }, [istate, sessionId]);

  // loading_intro → speaking_question: fetch next question
  useEffect(() => {
    if (istate.status !== "loading_intro" || !setup) return;
    const { questionIndex, questions } = istate;

    // Question already in state (restored from sessionStorage)
    if (questions.length > questionIndex) {
      setIstate(s => ({ ...s, status: "speaking_question" }));
      return;
    }

    if (fetchGuardRef.current === questionIndex) return;
    fetchGuardRef.current = questionIndex;

    fetch("/api/next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parsedJd: setup.parsed,
        persona: setup.persona,
        questionIndex,
        previousQuestions: questions.map(q => q.question),
      }),
    })
      .then(r => r.json())
      .then(q => setIstate(s => ({ ...s, questions: [...s.questions, q], status: "speaking_question" })))
      .catch(() => setIstate(s => ({ ...s, status: "speaking_question" })));
  }, [istate.status, istate.questionIndex, setup]);

  // speaking_question → awaiting_answer: play TTS then yield to user
  useEffect(() => {
    if (istate.status !== "speaking_question") return;
    const { questionIndex, questions } = istate;
    const currentQ = questions[questionIndex];
    if (!currentQ) return;

    if (speakGuardRef.current === questionIndex) return;
    speakGuardRef.current = questionIndex;

    speak(currentQ.question, () =>
      setIstate(s => ({ ...s, status: "awaiting_answer" }))
    );
  }, [istate.status, istate.questionIndex, istate.questions, speak]);

  // scoring_answer → loading_intro (next Q) or show_report
  useEffect(() => {
    if (istate.status !== "scoring_answer") return;
    const { questionIndex, questions, answers } = istate;

    if (scoreGuardRef.current === questionIndex) return;
    scoreGuardRef.current = questionIndex;

    const currentQ = questions[questionIndex];
    const transcript = answers[questionIndex] ?? "";
    const stats = cvDisabled ? null : questionStatsRef.current.finalize();

    fetch("/api/score-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQ?.question ?? "",
        targets: currentQ?.targets ?? [],
        transcript,
        stats,
        roleTitle: setup?.parsed?.role_title ?? "Software Engineer",
        seniority: setup?.parsed?.seniority ?? "mid",
        accessibilityMode: cvDisabled,
      }),
    })
      .then(r => r.json())
      .catch(() => SCORE_FALLBACK)
      .then(score => {
        const nextIndex = questionIndex + 1;
        questionStatsRef.current.reset();
        setIstate(s => {
          const newScores = [...s.scores, score];
          return nextIndex < MAX_QUESTIONS
            ? { ...s, scores: newScores, questionIndex: nextIndex, status: "loading_intro" }
            : { ...s, scores: newScores, status: "show_report" };
        });
      });
  }, [istate.status, istate.questionIndex, cvDisabled, setup]);

  const handleAnswerSubmit = useCallback((transcript: string) => {
    setIstate(s => ({ ...s, answers: [...s.answers, transcript], status: "scoring_answer" }));
  }, []);

  const handleStreamGranted = useCallback((s: MediaStream) => setStream(s), []);
  const persona = setup ? PERSONAS[setup.persona] : null;

  const rightPanel =
    istate.status === "show_report" ? (
      <ScoreReport questions={istate.questions} answers={istate.answers} scores={istate.scores} />
    ) : (
      <QuestionPanel state={istate} onAnswerSubmit={handleAnswerSubmit} />
    );

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-4 sm:space-y-6">

        <div className="space-y-1">
          <Link
            href="/setup"
            className="inline-block text-amber-100 hover:text-white hover:-translate-y-1 transition text-sm sm:text-base"
          >
            ← &nbsp;Exit
          </Link>
          <h1 className="setup-title">Interview Room</h1>
          {setup && (
            <p className="text-amber-100 text-sm sm:text-base">
              {setup.parsed?.role_title ?? "Software Engineer"} · {persona?.label ?? setup.persona}
            </p>
          )}
        </div>

        {cvDisabled ? (
          <div className="space-y-4">{rightPanel}</div>
        ) : !stream ? (
          <PermissionsGate onGranted={handleStreamGranted} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <WebcamView stream={stream} videoRef={videoRef} />
              <ConfidenceGauges posture={posture} eyeContact={eyeContact} />
              <TrackingLoop
                videoRef={videoRef}
                questionStats={questionStatsRef.current}
                onPostureChange={setPosture}
                onEyeContactChange={setEyeContact}
              />
            </div>
            <div>{rightPanel}</div>
          </div>
        )}

      </div>
    </main>
  );
}
