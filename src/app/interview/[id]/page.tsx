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

  const videoRef = useRef<HTMLVideoElement>(null);
  const questionStatsRef = useRef(new QuestionStats());

  useEffect(() => {
    const saved = sessionStorage.getItem(`session:${sessionId}:setup`);
    if (saved) setSetup(JSON.parse(saved));
    setCvDisabled(new URLSearchParams(window.location.search).get("cv") === "off");
  }, [sessionId]);

  const handleStreamGranted = useCallback((s: MediaStream) => setStream(s), []);

  const persona = setup ? PERSONAS[setup.persona] : null;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Interview Room</h1>
            {setup && (
              <p className="text-sm text-muted-foreground">
                {setup.parsed?.role_title ?? "Software Engineer"} · {persona?.label ?? setup.persona}
              </p>
            )}
          </div>
          <Link href="/setup" className="text-sm underline text-muted-foreground">
            ← Exit
          </Link>
        </div>

        {cvDisabled ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            CV mode disabled — type your answers below.
            <br />
            <span className="text-xs">(Voice + answer loop coming in Phase 3)</span>
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

            <div className="flex items-center justify-center rounded-lg border p-6 text-center text-sm text-muted-foreground">
              Voice + answer loop coming in Phase 3
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
