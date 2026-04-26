# Design: Landmark Visualizer Toggle + Posture Calibration

**Date:** 2026-04-26  
**Status:** Approved

---

## Overview

Two related improvements to the interview CV pipeline:

1. **Landmark visualizer toggle** — a canvas overlay on the webcam feed that draws the full MediaPipe pose skeleton and face mesh, toggled by a checkbox near the confidence gauges. Helps users understand what the system is tracking and how to position themselves.
2. **Calibration detection** — per-frame detection of ungradable positions (landmarks not visible or missing). Drives a warning banner above the webcam and a paused state on the gauges. Stat sampling is suppressed while uncalibrated so bad frames don't corrupt per-question scores.

---

## Data Flow

`TrackingLoop` gains two new optional callbacks:

```ts
onLandmarksChange?: (pose: NormalizedLandmark[] | null, face: NormalizedLandmark[] | null) => void;
onCalibrationChange?: (status: CalibrationStatus) => void;
```

Both are called on every processed frame (i.e., every `FRAME_SKIP`-th frame). The interview page (`/interview/[id]/page.tsx`) holds `landmarks` and `calibrationStatus` in `useState` and passes them down to child components. No new API routes, no new stores.

`CalibrationStatus` is a string union defined in a new file `src/lib/scoring/calibration.ts`:

```ts
export type CalibrationStatus = "ok" | "missing_shoulders" | "missing_face" | "no_detection";
```

The calibration check function lives in the same file:

```ts
export function getCalibrationStatus(
  pose: NormalizedLandmark[] | null,
  face: NormalizedLandmark[] | null
): CalibrationStatus
```

Trigger conditions:
- `"no_detection"` — `pose` is null or empty
- `"missing_shoulders"` — nose (0), left shoulder (11), or right shoulder (12) has `visibility < 0.5`
- `"missing_face"` — `face` is null or empty
- `"ok"` — all of the above pass

Priority: `no_detection` > `missing_shoulders` > `missing_face` > `ok`.

When status is not `"ok"`, `TrackingLoop` skips the `questionStats.sample()` call so uncalibrated frames don't pollute per-question averages.

---

## Landmark Visualizer

### `WebcamView` changes

`WebcamView` gets two new optional props:

```ts
showOverlay?: boolean;
landmarks?: { pose: NormalizedLandmark[] | null; face: NormalizedLandmark[] | null };
```

Internally, the `<video>` is wrapped in a `relative` div. A `<canvas>` with `absolute inset-0 pointer-events-none` is added as a sibling. A `ResizeObserver` on the video element keeps `canvas.width` / `canvas.height` in sync with the video's rendered pixel dimensions.

When `showOverlay` is true, a `useEffect` (depending on `landmarks`) draws on the canvas each time landmarks update:

- **Pose skeleton:** all 33 landmarks as 4px white filled circles; connected by the standard MediaPipe pose edges (defined as an array of `[a, b]` index pairs, covering shoulders, arms, torso, hips, legs) in `rgba(255,255,255,0.4)`, 2px stroke.
- **Face mesh:** all 478 face landmarks as 2px cyan (`rgba(0,255,255,0.6)`) filled circles, no connecting lines (too dense at this scale).

When `showOverlay` is false, the canvas is cleared on each landmarks update (the effect depends on both `showOverlay` and `landmarks`, so it re-runs at the 10fps inference rate).

### Toggle control

A `"Show landmarks"` checkbox is added to `ConfidenceGauges`, which renders directly below the webcam. `showOverlay` state lives in the interview page and is passed to both `ConfidenceGauges` (to render the toggle) and `WebcamView` (to control the canvas).

`ConfidenceGauges` gets two new optional props:
```ts
showOverlay?: boolean;
onToggleOverlay?: () => void;
```

---

## Calibration

### `CalibrationBanner` component

New component at `src/components/interview/calibration-banner.tsx`. Renders a yellow warning strip above the webcam when `status !== "ok"`. Messages:

| Status | Message |
|---|---|
| `no_detection` | "Move into frame so we can track your posture" |
| `missing_shoulders` | "Move back so both shoulders are visible" |
| `missing_face` | "Make sure your face is in the camera frame" |

Auto-dismisses (no X button) as soon as status returns to `"ok"`. Implemented with a simple conditional render — no animation needed.

### Gauge paused state

`ConfidenceGauges` gets a `calibrated` boolean prop. When `false`:
- Both gauge values display `"—"` instead of the numeric score
- Color is `text-gray-400` regardless of value

The numeric scores still update internally in the interview page state; the gauges just don't display them while uncalibrated. This means the rolling average has fresh data the moment calibration is restored.

---

## Component & File Summary

**New files:**
- `src/lib/scoring/calibration.ts` — `CalibrationStatus` type + `getCalibrationStatus()` function

**New components:**
- `src/components/interview/calibration-banner.tsx` — warning strip above webcam

**Modified:**
- `src/lib/scoring/posture.ts` — no change (calibration is upstream in `TrackingLoop`)
- `src/components/interview/tracking-loop.tsx` — add `onLandmarksChange`, `onCalibrationChange` props; call `getCalibrationStatus`; skip `questionStats.sample()` when not `"ok"`
- `src/components/interview/webcam-view.tsx` — wrap in relative div, add canvas overlay, `ResizeObserver`, draw logic
- `src/components/interview/confidence-gauges.tsx` — add `calibrated` prop, `showOverlay` / `onToggleOverlay` props, toggle checkbox
- `src/app/interview/[id]/page.tsx` — add `landmarks` + `calibrationStatus` state; wire new callbacks; render `CalibrationBanner`

---

## Out of Scope

- Improved posture scoring algorithm (separate future task)
- Smoothing/debouncing the calibration status to avoid flicker (can be added if needed)
- Persisting the overlay toggle preference across sessions
