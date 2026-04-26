import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Iris landmarks only present when refineLandmarks: true (length 478, not 468)
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;

export class EyeContactTracker {
  isLookingAtCamera(landmarks: NormalizedLandmark[]): boolean {
    if (!landmarks || landmarks.length < 478) return false;

    const leftIris = landmarks[LEFT_IRIS_CENTER];
    const leftOuter = landmarks[LEFT_EYE_OUTER];
    const leftInner = landmarks[LEFT_EYE_INNER];

    const rightIris = landmarks[RIGHT_IRIS_CENTER];
    const rightInner = landmarks[RIGHT_EYE_INNER];
    const rightOuter = landmarks[RIGHT_EYE_OUTER];

    const leftEyeWidth = Math.abs(leftInner.x - leftOuter.x);
    const rightEyeWidth = Math.abs(rightOuter.x - rightInner.x);

    if (leftEyeWidth < 0.001 || rightEyeWidth < 0.001) return false;

    // Iris position ratio: 0 = outer corner, 1 = inner corner
    const leftRatio = (leftIris.x - leftOuter.x) / leftEyeWidth;
    const rightRatio = (rightIris.x - rightInner.x) / rightEyeWidth;

    return leftRatio > 0.3 && leftRatio < 0.7 && rightRatio > 0.3 && rightRatio < 0.7;
  }
}
