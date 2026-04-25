import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

export function postureScore(landmarks: NormalizedLandmark[]): number {
  if (!landmarks || landmarks.length < 33) return 0;

  const nose = landmarks[NOSE];
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];

  // Shoulder tilt: penalize asymmetry
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderPenalty = Math.min(shoulderTilt * 500, 40);

  // Head lean: nose should sit clearly above the shoulder midpoint
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const headLean = shoulderMidY - nose.y; // positive = head above shoulders
  const leanPenalty = headLean < 0.05 ? (0.05 - headLean) * 400 : 0;

  // Head centering: nose should be roughly centered between the shoulders
  const headOffset = Math.abs(nose.x - shoulderMidX);
  const centerPenalty = Math.min(headOffset * 200, 20);

  return Math.max(0, Math.min(100, Math.round(100 - shoulderPenalty - leanPenalty - centerPenalty)));
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
