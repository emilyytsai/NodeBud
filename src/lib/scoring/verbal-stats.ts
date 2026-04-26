const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "right", "so"];
const SILENCE_RMS = 0.01;
const PAUSE_MS = 2000;
const ANSWER_START_GRACE_MS = 500;
const BURST_MIN_MS = 100;
const BURST_MAX_MS = 800;
const TRANSCRIPT_GAP_MS = 500;

export type VerbalStatsResult = {
  filler_word_count: number;
  filler_words_found: string[];
  acoustic_hesitation_count: number;
  wpm: number;
  long_pause_count: number;
};

export class VerbalStats {
  private fillerSet = new Set<string>();
  private fillerCount = 0;
  private hesitationCount = 0;
  private pauseCount = 0;
  private startTime = performance.now();
  private lastTranscript = "";
  private lastTranscriptTs = 0;
  private wasSilent = true;
  private silenceStart: number | null = null;
  private pauseCountedThisSilence = false;
  private burstStart: number | null = null;

  addInterimResult(text: string): void {
    const newPortion = text.slice(this.lastTranscript.length).toLowerCase();
    this.lastTranscript = text;
    this.lastTranscriptTs = performance.now();
    if (!newPortion.trim()) return;

    for (const filler of FILLER_WORDS) {
      const escaped = filler.replace(/\s+/g, "\\s+");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      const matches = newPortion.match(regex);
      if (matches) {
        this.fillerSet.add(filler);
        this.fillerCount += matches.length;
      }
    }
  }

  sampleAudio(analyser: AnalyserNode): void {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);

    const now = performance.now();
    const elapsed = now - this.startTime;
    const isSilent = rms < SILENCE_RMS;

    if (isSilent) {
      if (!this.wasSilent) {
        // Transition: sound → silence
        this.wasSilent = true;
        this.silenceStart = now;
        this.pauseCountedThisSilence = false;
        // Check if the burst that just ended qualifies as an acoustic hesitation
        if (this.burstStart !== null) {
          const burstDuration = now - this.burstStart;
          const timeSinceTranscript = now - this.lastTranscriptTs;
          if (
            burstDuration >= BURST_MIN_MS &&
            burstDuration <= BURST_MAX_MS &&
            timeSinceTranscript >= TRANSCRIPT_GAP_MS
          ) {
            this.hesitationCount++;
          }
          this.burstStart = null;
        }
      }
      // Count a long pause once per continuous silence period
      if (
        !this.pauseCountedThisSilence &&
        this.silenceStart !== null &&
        elapsed > ANSWER_START_GRACE_MS &&
        now - this.silenceStart > PAUSE_MS
      ) {
        this.pauseCount++;
        this.pauseCountedThisSilence = true;
      }
    } else {
      if (this.wasSilent) {
        // Transition: silence → sound
        this.wasSilent = false;
        this.silenceStart = null;
        this.burstStart = now;
      }
    }
  }

  finalize(finalTranscript: string): VerbalStatsResult {
    const durationSeconds = (performance.now() - this.startTime) / 1000;
    const wordCount = finalTranscript.trim().split(/\s+/).filter(Boolean).length;
    const wpm = durationSeconds < 5 ? 0 : Math.round((wordCount / durationSeconds) * 60);
    return {
      filler_word_count: this.fillerCount,
      filler_words_found: Array.from(this.fillerSet),
      acoustic_hesitation_count: this.hesitationCount,
      wpm,
      long_pause_count: this.pauseCount,
    };
  }

  reset(): void {
    this.fillerSet = new Set();
    this.fillerCount = 0;
    this.hesitationCount = 0;
    this.pauseCount = 0;
    this.startTime = performance.now();
    this.lastTranscript = "";
    this.lastTranscriptTs = 0;
    this.wasSilent = true;
    this.silenceStart = null;
    this.pauseCountedThisSilence = false;
    this.burstStart = null;
  }
}
