"use client";
import { useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Standard MediaPipe Pose landmark connections (index pairs)
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

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

    if (pose && pose.length >= 33) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
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
      for (const lm of pose) {
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Face mesh dots — no connections, too dense
    if (face && face.length > 0) {
      ctx.fillStyle = "rgba(0,255,255,0.6)";
      for (const lm of face) {
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 2, 0, Math.PI * 2);
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
