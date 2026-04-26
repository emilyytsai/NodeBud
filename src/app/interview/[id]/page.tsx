"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { PermissionsGate } from "@/components/interview/permissions-gate";
import { ConfidenceGauges } from "@/components/interview/confidence-gauges";
import { ScoreReport } from "@/components/interview/score-report";
import { AnswerInput } from "@/components/interview/answer-input";
import { ThinkingIndicator } from "@/components/interview/thinking-indicator";
import { useTTS } from "@/components/interview/audio-player";
import { QuestionStats } from "@/lib/scoring/question-stats";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
import type { InterviewState } from "@/lib/interview-state";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { CalibrationStatus } from "@/lib/scoring/calibration";
import { CalibrationBanner } from "@/components/interview/calibration-banner";
import { LandmarkCanvas } from "@/components/interview/landmark-canvas";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";
import { PERSONAS } from "@/lib/personas";
import type { DifficultyId } from "@/lib/difficulty";

const TrackingLoop = dynamic(
  () => import("@/components/interview/tracking-loop"),
  { ssr: false }
);


const SCORE_FALLBACK = {
  scores: { content_relevance: 5, technical_accuracy: 5, structure: 5, specificity: 5, communication: 5, verbal_delivery: 5 },
  overall: 50,
  strengths: ["You completed the question."],
  improvements: ["Try to give a more specific example next time."],
  weak_competencies: [],
  non_verbal_feedback: null,
  verbal_feedback: null,
  memory_writeback: null,
};

type SetupPayload = {
  jdText: string;
  persona: PersonaId;
  parsed: ParsedJd | null;
  questionCount?: number;
  difficulty?: DifficultyId;
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
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus>("no_detection");
  const [showOverlay, setShowOverlay] = useState(false);
  const [landmarks, setLandmarks] = useState<{
    pose: NormalizedLandmark[] | null;
    face: NormalizedLandmark[] | null;
  }>({ pose: null, face: null });
  const [istate, setIstate] = useState<InterviewState>(INITIAL_STATE);
  const [reviewUrl, setReviewUrl] = useState("/setup");

  const videoRef = useRef<HTMLVideoElement>(null);
  const questionStatsRef = useRef(new QuestionStats());
  const verbalStatsListRef = useRef<(VerbalStatsResult | null)[]>([]);
  const pendingVerbalStatsRef = useRef<VerbalStatsResult | null>(null);
  const fetchGuardRef = useRef(-1);
  const speakGuardRef = useRef(-1);
  const scoreGuardRef = useRef(-1);

  const { speak, stop } = useTTS(setup?.persona ?? "encouraging_recruiter", ttsMode);

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

    const keys = Object.keys(sessionStorage);
    const sessionKey = keys.find(k => k === `session:${sessionId}:setup`);
    if (sessionKey) setReviewUrl(`/setup/review?session=${sessionId}`);
  }, [sessionId]);

  useEffect(() => {
    if (istate.questionIndex === 0 && istate.status === "loading_intro" && istate.questions.length === 0) return;
    sessionStorage.setItem(`session:${sessionId}:state`, JSON.stringify(istate));
  }, [istate, sessionId]);

  useEffect(() => {
    if (istate.status !== "loading_intro" || !setup) return;
    if (!stream && !cvDisabled) return;
    const { questionIndex, questions } = istate;

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
        difficulty: setup.difficulty,
      }),
    })
      .then(r => r.json())
      .then(q => setIstate(s => ({ ...s, questions: [...s.questions, q], status: "speaking_question" })))
      .catch(() => setIstate(s => ({ ...s, status: "speaking_question" })));
  }, [istate.status, istate.questionIndex, setup, stream, cvDisabled]);

  useEffect(() => {
    if (istate.status !== "speaking_question") return;
    if (!stream && !cvDisabled) return;
    const { questionIndex, questions } = istate;
    const currentQ = questions[questionIndex];
    if (!currentQ) return;

    if (speakGuardRef.current === questionIndex) return;
    speakGuardRef.current = questionIndex;

    speak(currentQ.question, () =>
      setIstate(s => ({ ...s, status: "awaiting_answer" }))
    );
  }, [istate.status, istate.questionIndex, istate.questions, speak, stream, cvDisabled]);

  useEffect(() => {
    if (istate.status !== "scoring_answer") return;
    const { questionIndex, questions, answers } = istate;

    if (scoreGuardRef.current === questionIndex) return;
    scoreGuardRef.current = questionIndex;

    const currentQ = questions[questionIndex];
    const transcript = answers[questionIndex] ?? "";
    const stats = cvDisabled ? null : questionStatsRef.current.finalize();
    const verbalStats = pendingVerbalStatsRef.current;

    fetch("/api/score-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQ?.question ?? "",
        targets: currentQ?.targets ?? [],
        transcript,
        stats,
        verbalStats,
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
        verbalStatsListRef.current = [...verbalStatsListRef.current, verbalStats];
        pendingVerbalStatsRef.current = null;
        setIstate(s => {
          const newScores = [...s.scores, score];
          return nextIndex < (setup?.questionCount ?? 3)
            ? { ...s, scores: newScores, questionIndex: nextIndex, status: "loading_intro" }
            : { ...s, scores: newScores, status: "show_report" };
        });
      });
  }, [istate.status, istate.questionIndex, cvDisabled, setup]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const handleAnswerSubmit = useCallback((transcript: string, verbalStats: VerbalStatsResult | null) => {
    pendingVerbalStatsRef.current = verbalStats;
    setIstate(s => ({ ...s, answers: [...s.answers, transcript], status: "scoring_answer" }));
  }, []);

  const handleLandmarksChange = useCallback(
    (pose: NormalizedLandmark[] | null, face: NormalizedLandmark[] | null) => {
      setLandmarks({ pose, face });
    },
    []
  );

  const handleStreamGranted = useCallback((s: MediaStream) => setStream(s), []);
  const persona = setup ? PERSONAS[setup.persona] : null;
  const currentQ = istate.questions[istate.questionIndex];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-4 pt-6 pb-12 space-y-4 sm:space-y-6">

        <div className="space-y-1">
          <button
            onClick={() => {
              stop();
              window.location.href = reviewUrl;
            }}
            className="inline-block text-amber-100 hover:text-white hover:-translate-y-1 transition text-sm sm:text-base"
          >
            ← &nbsp;Exit
          </button>
          <h1 className="setup-title">Interview Room</h1>
          {setup && (
            <p className="text-amber-100 text-sm sm:text-base">
              {setup.parsed?.role_title ?? "Software Engineer"}
            </p>
          )}
        </div>

        {istate.status === "show_report" ? (
          <ScoreReport
            questions={istate.questions}
            answers={istate.answers}
            scores={istate.scores}
            verbalStatsList={verbalStatsListRef.current}
            roleTitle={setup?.parsed?.role_title ?? "Software Engineer"}
            persona={setup?.persona ?? "encouraging_recruiter"}
          />
        ) : !stream && !cvDisabled ? (
          <PermissionsGate onGranted={handleStreamGranted} />
        ) : (
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 items-end">

              <div className="space-y-3">
                {cvDisabled ? (
                  <div className="glass-input rounded-xl border border-white/20 p-6 text-center text-gray-400 text-sm aspect-video flex items-center justify-center">
                    CV mode off
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden glass-input border border-white/20 aspect-video w-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <LandmarkCanvas show={showOverlay} videoRef={videoRef} landmarks={landmarks} />
                    {/* Banner overlaid inside the video — no layout shift */}
                    {calibrationStatus !== "ok" && (
                      <div className="absolute top-2 left-2 right-2 z-10">
                        <CalibrationBanner status={calibrationStatus} />
                      </div>
                    )}
                    <TrackingLoop
                      videoRef={videoRef}
                      questionStats={questionStatsRef.current}
                      onPostureChange={setPosture}
                      onEyeContactChange={setEyeContact}
                      onLandmarksChange={handleLandmarksChange}
                      onCalibrationChange={setCalibrationStatus}
                    />
                  </div>
                )}
                <ConfidenceGauges
                  posture={posture}
                  eyeContact={eyeContact}
                  calibrated={cvDisabled || calibrationStatus === "ok"}
                  showOverlay={showOverlay}
                  onToggleOverlay={() => setShowOverlay(v => !v)}
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
                  <Image
                    src="/interviewer.png"
                    alt="Interviewer"
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 144px, 176px"
                  />
                </div>
                <p className="text-sm font-semibold text-amber-100 -mt-2">
                  {persona?.label ?? "Interviewer"}
                </p>
                <p className="text-xs text-gray-400">
                  {istate.status === "speaking_question" && (
                    <span className="text-amber-300 animate-pulse">● Speaking...</span>
                  )}
                  {istate.status === "awaiting_answer" && "Waiting for your answer..."}
                  {istate.status === "scoring_answer" && "Thinking about your answer..."}
                  {istate.status === "loading_intro" && "Preparing next question..."}
                </p>

                {istate.status === "speaking_question" && (
                  <button
                    onClick={() => {
                      stop();
                      setIstate(s => ({ ...s, status: "awaiting_answer" }));
                    }}
                    className="text-xs text-gray-500 hover:text-amber-100 hover:-translate-y-1 transition underline"
                  >
                    Skip →
                  </button>
                )}

                <div className="w-full">
                  {istate.status === "awaiting_answer" && (
                    <AnswerInput onSubmit={handleAnswerSubmit} />
                  )}
                  {(istate.status === "scoring_answer" || istate.status === "loading_intro") && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
                      <ThinkingIndicator />
                      {istate.status === "scoring_answer" && "Evaluating..."}
                      {istate.status === "loading_intro" && "Loading..."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="question-panel p-5" style={{ border: '1px solid rgba(255, 255, 255, 0.6)' }}>
              <div className="text-xs text-gray-400 mb-2">
                Question {istate.questionIndex + 1} of {setup?.questionCount ?? 3}
                {currentQ && ` · ${currentQ.type.replace("_", " ")}`}
              </div>
              {currentQ ? (
                <p className="text-amber-100 text-base leading-relaxed">{currentQ.question}</p>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <ThinkingIndicator /> Preparing question...
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}