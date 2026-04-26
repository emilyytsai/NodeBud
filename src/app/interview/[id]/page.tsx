"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PermissionsGate } from "@/components/interview/permissions-gate";
import { WebcamView } from "@/components/interview/webcam-view";
import { ConfidenceGauges } from "@/components/interview/confidence-gauges";
import { QuestionStats } from "@/lib/scoring/question-stats";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";
import { PERSONAS } from "@/lib/personas";

const TrackingLoop = dynamic(
  () => import("@/components/interview/tracking-loop"),
  { ssr: false }
);

type SetupPayload = {
  jdText: string;
  persona: PersonaId;
  parsed: ParsedJd | null;
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
  const [posture, setPosture] = useState(100);
  const [eyeContact, setEyeContact] = useState(100);
  const [reviewUrl, setReviewUrl] = useState("/setup");

  const videoRef = useRef<HTMLVideoElement>(null);
  const questionStatsRef = useRef(new QuestionStats());

  useEffect(() => {
    const saved = sessionStorage.getItem(`session:${sessionId}:setup`);
    if (saved) setSetup(JSON.parse(saved));
    setCvDisabled(new URLSearchParams(window.location.search).get("cv") === "off");
    const keys = Object.keys(sessionStorage);
    const sessionKey = keys.find(k => k === `session:${sessionId}:setup`);
    if (sessionKey) setReviewUrl(`/setup/review?session=${sessionId}`);
  }, [sessionId]);

  const handleStreamGranted = useCallback((s: MediaStream) => setStream(s), []);

  const persona = setup ? PERSONAS[setup.persona] : null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <Link
            href={reviewUrl}
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

        {/* Content */}
        {cvDisabled ? (
          <div className="glass-input rounded-xl border border-white/20 p-6 sm:p-8 text-center text-amber-100">
            CV mode disabled — type your answers below.
            <br />
            <span className="text-xs text-gray-400">(Voice + answer loop coming in Phase 3)</span>
          </div>
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

            <div className="glass-input flex items-center justify-center rounded-xl border border-white/20 p-6 text-center text-amber-100 min-h-[200px] md:min-h-0">
              Voice + answer loop coming in Phase 3
            </div>
          </div>
        )}

      </div>
    </main>
  );
}