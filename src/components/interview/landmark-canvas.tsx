"use client";
import { useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Upper-body pose landmarks we care about
const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16, 23, 24];
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],           // shoulder to shoulder
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], [23, 24], // torso
];

// Face landmarks used by EyeContactTracker
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const LEFT_IRIS = 468;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 362;
const RIGHT_IRIS = 473;

const EYE_CONNECTIONS: [number, number][] = [
  [LEFT_EYE_OUTER, LEFT_EYE_INNER],
  [RIGHT_EYE_OUTER, RIGHT_EYE_INNER],
];
const EYE_CORNER_INDICES = [LEFT_EYE_OUTER, LEFT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_INNER];
const IRIS_INDICES = [LEFT_IRIS, RIGHT_IRIS];

interface LandmarkCanvasProps {
  show: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: {
    pose: NormalizedLandmark[] | null;
    face: NormalizedLandmark[] | null;
  };
}

export function LandmarkCanvas({ show, videoRef, landmarks }: LandmarkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep canvas dimensions in sync with video rendered size
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const observer = new ResizeObserver(() => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    });
    observer.observe(video);
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    return () => observer.disconnect();
  }, [videoRef]);

  // Draw landmarks whenever they update or show toggles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!show) return;

    const { width, height } = canvas;
    const { pose, face } = landmarks;

    // Flip x to match the CSS scale-x-[-1] on the <video>
    const px = (lm: NormalizedLandmark) => (1 - lm.x) * width;
    const py = (lm: NormalizedLandmark) => lm.y * height;

    // --- Pose: upper body skeleton ---
    if (pose && pose.length >= 25) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      for (const [a, b] of POSE_CONNECTIONS) {
        const la = pose[a];
        const lb = pose[b];
        if (!la || !lb) continue;
        ctx.beginPath();
        ctx.moveTo(px(la), py(la));
        ctx.lineTo(px(lb), py(lb));
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const idx of POSE_INDICES) {
        const lm = pose[idx];
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Face: eye corners + iris centers only ---
    if (face && face.length >= 478) {
      // Eye corner connecting lines
      ctx.strokeStyle = "rgba(0,220,255,0.7)";
      ctx.lineWidth = 1.5;
      for (const [a, b] of EYE_CONNECTIONS) {
        const la = face[a];
        const lb = face[b];
        if (!la || !lb) continue;
        ctx.beginPath();
        ctx.moveTo(px(la), py(la));
        ctx.lineTo(px(lb), py(lb));
        ctx.stroke();
      }

      // Eye corner dots (cyan)
      ctx.fillStyle = "rgba(0,220,255,0.9)";
      for (const idx of EYE_CORNER_INDICES) {
        const lm = face[idx];
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Iris center dots (yellow — the actual gaze tracking points)
      ctx.fillStyle = "rgba(255,220,0,0.95)";
      for (const idx of IRIS_INDICES) {
        const lm = face[idx];
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [show, landmarks]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
