# Landmark Visualizer + Posture Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable canvas overlay that draws MediaPipe pose skeleton + face mesh on the webcam feed, and detect ungradable positions (low landmark visibility) to warn the user and pause stat sampling.

**Architecture:** `TrackingLoop` emits raw landmarks and a calibration status via new callbacks each frame. A new `LandmarkCanvas` component receives those landmarks and draws them on an `<canvas>` overlay inside the existing `relative` video container. `CalibrationBanner` shows a yellow strip when uncalibrated; `ConfidenceGauges` shows `"—"` instead of scores. The interview page holds all new state and wires everything together.

**Note on architecture delta from spec:** The interview page inlines the `<video>` directly (with `scale-x-[-1]`) — `WebcamView` is not used. So instead of modifying `WebcamView`, we create a `LandmarkCanvas` sibling component. X-coordinates are flipped in the draw function (`(1 - lm.x) * width`) to match the CSS-mirrored video display.

**Tech Stack:** React, TypeScript, Canvas 2D API, ResizeObserver, `@mediapipe/tasks-vision` (type-only import), Tailwind v4

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/scoring/calibration.ts` | `CalibrationStatus` type + `getCalibrationStatus()` |
| Create | `src/components/interview/landmark-canvas.tsx` | Canvas overlay: ResizeObserver, draw pose skeleton + face mesh |
| Create | `src/components/interview/calibration-banner.tsx` | Yellow warning strip above webcam |
| Modify | `src/components/interview/tracking-loop.tsx` | Add `onLandmarksChange` + `onCalibrationChange` callbacks; skip sample when uncalibrated |
| Modify | `src/components/interview/confidence-gauges.tsx` | Add `calibrated`, `showOverlay`, `onToggleOverlay` props |
| Modify | `src/app/interview/[id]/page.tsx` | Add state, wire callbacks, render new components |

---

## Task 1: Calibration utility

**Files:**
- Create: `src/lib/scoring/calibration.ts`

- [ ] **Step 1: Create the file**

```ts
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type CalibrationStatus =
  | "ok"
  | "missing_shoulders"
  | "missing_face"
  | "no_detection";

const VISIBILITY_THRESHOLD = 0.5;
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

export function getCalibrationStatus(
  pose: NormalizedLandmark[] | null,
  face: NormalizedLandmark[] | null
): CalibrationStatus {
  if (!pose || pose.length === 0) return "no_detection";

  for (const idx of [NOSE, LEFT_SHOULDER, RIGHT_SHOULDER]) {
    const lm = pose[idx];
    if (!lm || (lm.visibility !== undefined && lm.visibility < VISIBILITY_THRESHOLD)) {
      return "missing_shoulders";
    }
  }

  if (!face || face.length === 0) return "missing_face";

  return "ok";
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build passes with no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring/calibration.ts
git commit -m "feat: add CalibrationStatus type and getCalibrationStatus utility"
```

---

## Task 2: Update TrackingLoop with landmark + calibration callbacks

**Files:**
- Modify: `src/components/interview/tracking-loop.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";
import { useEffect, useRef, type RefObject } from "react";
import { initLandmarkers } from "@/lib/mediapipe/init";
import { postureScore, RollingScore } from "@/lib/scoring/posture";
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

            if (posture !== null) rollingPosture.current.push(posture);
            rollingEyeContact.current.push(lookingAtCamera ? 100 : 0);

            onPostureChange(rollingPosture.current.get());
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/tracking-loop.tsx
git commit -m "feat: emit landmarks and calibration status from TrackingLoop"
```

---

## Task 3: LandmarkCanvas component

**Files:**
- Create: `src/components/interview/landmark-canvas.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
    // Set initial size
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

    // Helper: flip x to match the CSS scale-x-[-1] on the <video>
    const px = (lm: NormalizedLandmark) => (1 - lm.x) * width;
    const py = (lm: NormalizedLandmark) => lm.y * height;

    // Draw pose skeleton connections
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

      // Draw pose landmark dots
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const lm of pose) {
        ctx.beginPath();
        ctx.arc(px(lm), py(lm), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw face mesh dots (no connections — too dense)
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/landmark-canvas.tsx
git commit -m "feat: add LandmarkCanvas overlay component"
```

---

## Task 4: CalibrationBanner component

**Files:**
- Create: `src/components/interview/calibration-banner.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { CalibrationStatus } from "@/lib/scoring/calibration";

const MESSAGES: Record<Exclude<CalibrationStatus, "ok">, string> = {
  no_detection: "Move into frame so we can track your posture",
  missing_shoulders: "Move back so both shoulders are visible",
  missing_face: "Make sure your face is in the camera frame",
};

interface CalibrationBannerProps {
  status: CalibrationStatus;
}

export function CalibrationBanner({ status }: CalibrationBannerProps) {
  if (status === "ok") return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/20 border border-yellow-400/40 px-3 py-2 text-sm text-yellow-300">
      <span>⚠</span>
      <span>{MESSAGES[status]}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/calibration-banner.tsx
git commit -m "feat: add CalibrationBanner component"
```

---

## Task 5: Update ConfidenceGauges with calibrated state + overlay toggle

**Files:**
- Modify: `src/components/interview/confidence-gauges.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
interface ConfidenceGaugesProps {
  posture: number;
  eyeContact: number;
  calibrated?: boolean;
  showOverlay?: boolean;
  onToggleOverlay?: () => void;
}

export function ConfidenceGauges({
  posture,
  eyeContact,
  calibrated = true,
  showOverlay,
  onToggleOverlay,
}: ConfidenceGaugesProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <GaugeCard label="Posture" value={posture} calibrated={calibrated} />
        <GaugeCard label="Eye Contact" value={eyeContact} calibrated={calibrated} />
      </div>
      {onToggleOverlay !== undefined && (
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition select-none">
          <input
            type="checkbox"
            checked={showOverlay ?? false}
            onChange={() => onToggleOverlay()}
            className="accent-cyan-400"
          />
          Show landmarks
        </label>
      )}
    </div>
  );
}

function GaugeCard({
  label,
  value,
  calibrated,
}: {
  label: string;
  value: number;
  calibrated: boolean;
}) {
  const color = !calibrated
    ? "text-gray-400"
    : value >= 70
    ? "text-green-400"
    : value >= 40
    ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="flex-1 glass-input rounded-lg border border-white/20 p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {calibrated ? `${value}%` : "—"}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build passes (existing call sites only pass `posture` + `eyeContact`, new props are optional so no breakage).

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/confidence-gauges.tsx
git commit -m "feat: add calibrated state and landmark overlay toggle to ConfidenceGauges"
```

---

## Task 6: Wire everything in the interview page

**Files:**
- Modify: `src/app/interview/[id]/page.tsx`

- [ ] **Step 1: Add new imports at the top of the file (after existing imports)**

Find this block near the top:
```tsx
import { QuestionStats } from "@/lib/scoring/question-stats";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
import type { InterviewState } from "@/lib/interview-state";
```

Replace with:
```tsx
import { QuestionStats } from "@/lib/scoring/question-stats";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
import type { InterviewState } from "@/lib/interview-state";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { CalibrationStatus } from "@/lib/scoring/calibration";
import { CalibrationBanner } from "@/components/interview/calibration-banner";
import { LandmarkCanvas } from "@/components/interview/landmark-canvas";
```

- [ ] **Step 2: Add new state variables**

Find this block:
```tsx
const [posture, setPosture] = useState(100);
const [eyeContact, setEyeContact] = useState(100);
```

Replace with:
```tsx
const [posture, setPosture] = useState(100);
const [eyeContact, setEyeContact] = useState(100);
const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus>("no_detection");
const [showOverlay, setShowOverlay] = useState(false);
const [landmarks, setLandmarks] = useState<{
  pose: NormalizedLandmark[] | null;
  face: NormalizedLandmark[] | null;
}>({ pose: null, face: null });
```

- [ ] **Step 3: Add handler for landmarks change**

Find this line:
```tsx
const handleStreamGranted = useCallback((s: MediaStream) => setStream(s), []);
```

Add before it:
```tsx
const handleLandmarksChange = useCallback(
  (pose: NormalizedLandmark[] | null, face: NormalizedLandmark[] | null) => {
    setLandmarks({ pose, face });
  },
  []
);
```

- [ ] **Step 4: Wire new props to TrackingLoop**

Find:
```tsx
<TrackingLoop
  videoRef={videoRef}
  questionStats={questionStatsRef.current}
  onPostureChange={setPosture}
  onEyeContactChange={setEyeContact}
/>
```

Replace with:
```tsx
<TrackingLoop
  videoRef={videoRef}
  questionStats={questionStatsRef.current}
  onPostureChange={setPosture}
  onEyeContactChange={setEyeContact}
  onLandmarksChange={handleLandmarksChange}
  onCalibrationChange={setCalibrationStatus}
/>
```

- [ ] **Step 5: Add LandmarkCanvas inside the video container**

Find:
```tsx
<div className="relative rounded-xl overflow-hidden glass-input border border-white/20 aspect-video w-full">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="w-full h-full object-cover scale-x-[-1]"
  />
  <TrackingLoop
```

Replace with:
```tsx
<div className="relative rounded-xl overflow-hidden glass-input border border-white/20 aspect-video w-full">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="w-full h-full object-cover scale-x-[-1]"
  />
  <LandmarkCanvas show={showOverlay} videoRef={videoRef} landmarks={landmarks} />
  <TrackingLoop
```

- [ ] **Step 6: Add CalibrationBanner above the video container and wire gauge props**

Find:
```tsx
<div className="space-y-3">
  {cvDisabled ? (
```

Replace with:
```tsx
<div className="space-y-3">
  {!cvDisabled && <CalibrationBanner status={calibrationStatus} />}
  {cvDisabled ? (
```

Then find:
```tsx
<ConfidenceGauges posture={posture} eyeContact={eyeContact} />
```

Replace with:
```tsx
<ConfidenceGauges
  posture={posture}
  eyeContact={eyeContact}
  calibrated={cvDisabled || calibrationStatus === "ok"}
  showOverlay={showOverlay}
  onToggleOverlay={() => setShowOverlay(v => !v)}
/>
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: build passes with no TypeScript errors.

- [ ] **Step 8: Manual smoke test in browser**

Run `npm run dev`, open the interview room:
1. Position yourself fully in frame — banner should disappear and gauges show numbers
2. Move out of frame — banner appears with the correct message
3. Tick "Show landmarks" — cyan face dots and white pose skeleton appear overlaid on the webcam
4. Untick — overlay clears
5. Slouch or look away — gauge colors update accordingly

- [ ] **Step 9: Commit**

```bash
git add src/app/interview/[id]/page.tsx
git commit -m "feat: wire landmark visualizer toggle and calibration banner into interview room"
```
