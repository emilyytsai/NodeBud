export function compositeConfidence(posture: number, eyeContact: number): number {
  return Math.round(posture * 0.4 + eyeContact * 0.6);
}
