import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

export function postureScore(landmarks: NormalizedLandmark[]): number {
  if (!landmarks || landmarks.length < 33) return 0;

  const nose = landmarks[NOSE];
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];

  // Shoulder width as a camera-distance proxy — all thresholds are expressed
  // as fractions of this so the algorithm is invariant to how close the user
  // sits to the camera.
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const ref = Math.max(shoulderWidth, 0.05);

  // 1. Shoulder tilt: Y asymmetry between shoulders (max −30)
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / ref;
  const shoulderPenalty = Math.min(shoulderTilt * 120, 30);

  // 2. Head lean: nose must sit clearly above shoulder midpoint (max −30)
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const headLean = (shoulderMidY - nose.y) / ref;
  const leanPenalty = headLean < 0.25 ? Math.min((0.25 - headLean) * 80, 30) : 0;

  // 3. Head centering: nose X near horizontal shoulder midpoint (max −20)
  const headOffset = Math.abs(nose.x - shoulderMidX) / ref;
  const centerPenalty = Math.min(headOffset * 80, 20);

  // 4 & 5. Ear-based penalties — only when ears are reliably detected.
  // Ears are often partially occluded by hair; skip rather than penalize noise.
  const earsDetected =
    leftEar && rightEar &&
    (leftEar.visibility === undefined || leftEar.visibility > 0.3) &&
    (rightEar.visibility === undefined || rightEar.visibility > 0.3);

  let pitchPenalty = 0;
  let tiltPenalty = 0;

  if (earsDetected) {
    // 4. Head pitch: nose well below ear midpoint = nodding down (max −20)
    // Grace zone of 0.5× shoulder-width below ear level before penalizing.
    const earMidY = (leftEar.y + rightEar.y) / 2;
    const headPitch = (nose.y - earMidY) / ref;
    pitchPenalty = headPitch > 0.5 ? Math.min((headPitch - 0.5) * 60, 20) : 0;

    // 5. Head tilt relative to body: ear asymmetry beyond shoulder tilt (max −15)
    // Subtracting shoulder tilt isolates head-only tilt (e.g. resting head on shoulder).
    const shoulderTiltSigned = leftShoulder.y - rightShoulder.y;
    const earTiltSigned = leftEar.y - rightEar.y;
    const headTiltRelative = Math.abs(earTiltSigned - shoulderTiltSigned) / ref;
    tiltPenalty = Math.min(headTiltRelative * 80, 15);
  }

  return Math.max(0, Math.min(100, Math.round(
    100 - shoulderPenalty - leanPenalty - centerPenalty - pitchPenalty - tiltPenalty
  )));
}

export class RollingScore {
  private samples: number[] = [];
  private readonly windowSize: number;

  constructor(windowSeconds = 3, fps = 10) {
    this.windowSize = windowSeconds * fps;
  }

  push(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.windowSize) this.samples.shift();
  }

  get(): number {
    if (this.samples.length === 0) return 100;
    return Math.round(this.samples.reduce((a, b) => a + b, 0) / this.samples.length);
  }
}

// Tracks lateral sway of the shoulder midpoint over a longer window.
// High variance = fidgeting/swaying = penalty on posture score.
export class StabilityTracker {
  private samples: number[] = [];
  private readonly windowSize: number;

  constructor(windowSeconds = 5, fps = 10) {
    this.windowSize = windowSeconds * fps;
  }

  push(x: number): void {
    this.samples.push(x);
    if (this.samples.length > this.windowSize) this.samples.shift();
  }

  getScore(): number {
    if (this.samples.length < 5) return 100;
    const mean = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const variance = this.samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / this.samples.length;
    const stdDev = Math.sqrt(variance);
    // stdDev of 0.02 normalized units (~minor sway) → ~30 pt penalty
    // stdDev of 0.067+ → score floored to 0
    return Math.max(0, Math.min(100, Math.round(100 - stdDev * 1500)));
  }
}
