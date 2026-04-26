"use client";
import { useEffect, useRef, type RefObject } from "react";
import { initLandmarkers } from "@/lib/mediapipe/init";
import { postureScore, RollingScore, StabilityTracker } from "@/lib/scoring/posture";
import { EyeContactTracker } from "@/lib/scoring/eye-contact";
import { getCalibrationStatus, type CalibrationStatus } from "@/lib/scoring/calibration";
import type { QuestionStats } from "@/lib/scoring/question-stats";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const FRAME_SKIP = 3;

interface TrackingLoopProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  questionStats: QuestionStats;
  onPostureChange: (value: number) => void;
  onEyeContactChange: (value: number) => void;
  onLandmarksChange?: (
    pose: NormalizedLandmark[] | null,
    face: NormalizedLandmark[] | null
  ) => void;
  onCalibrationChange?: (status: CalibrationStatus) => void;
}

export default function TrackingLoop({
  videoRef,
  questionStats,
  onPostureChange,
  onEyeContactChange,
  onLandmarksChange,
  onCalibrationChange,
}: TrackingLoopProps) {
  const rafIdRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const rollingPosture = useRef(new RollingScore());
  const rollingEyeContact = useRef(new RollingScore());
  const stabilityTracker = useRef(new StabilityTracker());
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

            const poseLandmarks = poseResult.landmarks?.[0] ?? null;
            const faceLandmarks = faceResult.faceLandmarks?.[0] ?? null;

            if (!firstFrameLogged.current && faceLandmarks) {
              console.log(
                "[CV] iris refinement check — landmark count:",
                faceLandmarks.length,
                faceLandmarks.length === 478 ? "✓ ON" : "✗ OFF (eye contact will be 0%)"
              );
              firstFrameLogged.current = true;
            }

            const calibration = getCalibrationStatus(poseLandmarks, faceLandmarks);
            onCalibrationChange?.(calibration);
            onLandmarksChange?.(poseLandmarks, faceLandmarks);

            const posture = poseLandmarks ? postureScore(poseLandmarks) : null;
            const lookingAtCamera = faceLandmarks
              ? eyeTracker.current.isLookingAtCamera(faceLandmarks)
              : false;

            if (posture !== null) {
              rollingPosture.current.push(posture);
              const ls = poseLandmarks![11];
              const rs = poseLandmarks![12];
              if (ls && rs) stabilityTracker.current.push((ls.x + rs.x) / 2);
            }
            rollingEyeContact.current.push(lookingAtCamera ? 100 : 0);

            // Combine smoothed posture (85%) with stability score (15%)
            const smoothedPosture = rollingPosture.current.get();
            const stability = stabilityTracker.current.getScore();
            const combined = Math.round(smoothedPosture * 0.85 + stability * 0.15);
            onPostureChange(combined);
            onEyeContactChange(rollingEyeContact.current.get());

            // Only sample stats when landmarks are reliable
            if (calibration === "ok") {
              questionStats.sample({ posture, lookingAtCamera });
            }
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
