"use client";
import { useEffect, useRef, type RefObject } from "react";
import { initLandmarkers } from "@/lib/mediapipe/init";
import { postureScore, RollingScore } from "@/lib/scoring/posture";
import { EyeContactTracker } from "@/lib/scoring/eye-contact";
import type { QuestionStats } from "@/lib/scoring/question-stats";

const FRAME_SKIP = 3; // 30fps rAF / 3 = ~10fps inference

interface TrackingLoopProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  questionStats: QuestionStats;
  onPostureChange: (value: number) => void;
  onEyeContactChange: (value: number) => void;
}

export default function TrackingLoop({
  videoRef,
  questionStats,
  onPostureChange,
  onEyeContactChange,
}: TrackingLoopProps) {
  const rafIdRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const rollingPosture = useRef(new RollingScore());
  const rollingEyeContact = useRef(new RollingScore());
  const eyeTracker = useRef(new EyeContactTracker());
  const firstFrameLogged = useRef(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const landmarkers = await initLandmarkers();
      if (!active) {
        landmarkers.pose.close();
        landmarkers.face.close();
        return;
      }

      function loop() {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          rafIdRef.current = requestAnimationFrame(loop);
          return;
        }

        if (frameCountRef.current++ % FRAME_SKIP === 0) {
          const ts = performance.now();
          try {
            const poseResult = landmarkers.pose.detectForVideo(video, ts);
            const faceResult = landmarkers.face.detectForVideo(video, ts);

            const poseLandmarks = poseResult.landmarks?.[0];
            const faceLandmarks = faceResult.faceLandmarks?.[0];

            if (!firstFrameLogged.current && faceLandmarks) {
              console.log(
                "[CV] iris refinement check — landmark count:",
                faceLandmarks.length,
                faceLandmarks.length === 478 ? "✓ ON" : "✗ OFF (eye contact will be 0%)"
              );
              firstFrameLogged.current = true;
            }

            const posture = poseLandmarks ? postureScore(poseLandmarks) : null;
            const lookingAtCamera = faceLandmarks
              ? eyeTracker.current.isLookingAtCamera(faceLandmarks)
              : false;

            if (posture !== null) rollingPosture.current.push(posture);
            rollingEyeContact.current.push(lookingAtCamera ? 100 : 0);

            onPostureChange(rollingPosture.current.get());
            onEyeContactChange(rollingEyeContact.current.get());

            questionStats.sample({ posture, lookingAtCamera });
          } catch (e) {
            console.warn("[CV] frame error:", e);
          }
        }

        rafIdRef.current = requestAnimationFrame(loop);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      active = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []); // intentionally empty — refs are stable

  return null;
}
