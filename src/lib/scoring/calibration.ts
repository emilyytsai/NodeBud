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
