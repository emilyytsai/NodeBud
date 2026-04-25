export class QuestionStats {
  private postureSamples: number[] = [];
  private eyeContactHits = 0;
  private eyeContactSamples = 0;
  private slouchFrames = 0;
  private lookAwayCount = 0;
  private wasLookingLastFrame = true;
  private startTime = performance.now();

  sample(opts: { posture: number | null; lookingAtCamera: boolean }) {
    if (opts.posture !== null) {
      this.postureSamples.push(opts.posture);
      if (opts.posture < 60) this.slouchFrames++;
    }
    this.eyeContactSamples++;
    if (opts.lookingAtCamera) {
      this.eyeContactHits++;
    } else if (this.wasLookingLastFrame) {
      this.lookAwayCount++;
    }
    this.wasLookingLastFrame = opts.lookingAtCamera;
  }

  finalize(): QuestionStatsResult {
    const elapsedSec = (performance.now() - this.startTime) / 1000;
    const postureAvg =
      this.postureSamples.length === 0
        ? null
        : this.postureSamples.reduce((a, b) => a + b, 0) / this.postureSamples.length;

    return {
      duration_seconds: Math.round(elapsedSec),
      posture_avg: postureAvg === null ? null : Math.round(postureAvg),
      eye_contact_pct:
        this.eyeContactSamples === 0
          ? null
          : Math.round((this.eyeContactHits / this.eyeContactSamples) * 100),
      slouch_seconds: Math.round(this.slouchFrames / 10), // 10fps
      look_away_count: this.lookAwayCount,
    };
  }

  reset() {
    this.postureSamples = [];
    this.eyeContactHits = 0;
    this.eyeContactSamples = 0;
    this.slouchFrames = 0;
    this.lookAwayCount = 0;
    this.wasLookingLastFrame = true;
    this.startTime = performance.now();
  }
}

export type QuestionStatsResult = {
  duration_seconds: number;
  posture_avg: number | null;
  eye_contact_pct: number | null;
  slouch_seconds: number;
  look_away_count: number;
};
