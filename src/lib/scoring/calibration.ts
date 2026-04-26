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

// MediaPipe predicts landmark positions even when off-screen and may assign
// high visibility to extrapolated positions. Checking coordinates are within
// the normalized image bounds [0,1] is a more reliable in-frame test.
function isInFrame(lm: NormalizedLandmark): boolean {
  return lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1;
}

function isVisible(lm: NormalizedLandmark): boolean {
  return isInFrame(lm) && (lm.visibility === undefined || lm.visibility >= VISIBILITY_THRESHOLD);
}

export function getCalibrationStatus(
  pose: NormalizedLandmark[] | null,
  face: NormalizedLandmark[] | null
): CalibrationStatus {
  if (!pose || pose.length === 0) return "no_detection";

  for (const idx of [NOSE, LEFT_SHOULDER, RIGHT_SHOULDER]) {
    const lm = pose[idx];
    if (!lm || !isVisible(lm)) return "missing_shoulders";
  }

  if (!face || face.length === 0) return "missing_face";

  return "ok";
}
