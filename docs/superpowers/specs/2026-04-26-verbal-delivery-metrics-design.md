# Verbal Delivery Metrics — Design Spec

**Date:** 2026-04-26
**Branch:** sam
**Status:** Approved, pending implementation

---

## Overview

Add three verbal delivery metrics — filler word count, speaking pace (WPM), and long pause count — to the interview scoring pipeline. Metrics are computed entirely client-side during the answer recording window and bundled with existing CV stats when sent to Gemma for scoring. Results surface in a new dedicated "Verbal delivery" section on the score report, including a new `verbal_delivery` score dimension (1–10).

---

## Goals

- Measure filler words (transcript-based word scan + acoustic "um"/"uh" detection)
- Measure speaking pace in WPM (word count ÷ duration)
- Measure long pauses (silence gaps >2s mid-answer)
- Feed all three into Gemma as context for a new `verbal_delivery` score dimension
- Display raw numbers + Gemma's feedback in a dedicated score report section

## Non-Goals

- No live UI gauges during the interview (score report only)
- No external transcription service (Web Speech API only)
- No audio sent over the network (all analysis is client-side)

---

## Architecture

This feature follows the existing **heuristics-bundle pattern**: client-side analysis reduces audio/transcript to a small stats object, which is bundled with the answer and sent to Gemma as JSON. No raw audio or video ever leaves the browser.

The implementation mirrors the existing `QuestionStats` / CV stats pattern exactly:

| CV metrics | Verbal metrics |
|---|---|
| `src/lib/scoring/question-stats.ts` | `src/lib/scoring/verbal-stats.ts` (new) |
| Sampled via `TrackingLoop` at 10fps | Sampled via `AudioContext` at 10fps + interim transcript callbacks |
| Finalized at answer submit | Finalized at answer submit |
| Passed to `/api/score-answer` as `stats` | Passed to `/api/score-answer` as `verbalStats` |

---

## Data Layer — `VerbalStats` class

**File:** `src/lib/scoring/verbal-stats.ts`

### Tracking

**Filler words (transcript-based):**
- Scans each interim Web Speech API result for standalone occurrences of: `um`, `uh`, `like`, `you know`, `basically`, `right`, `so`
- Deduplicates against previous interim results to avoid double-counting as the transcript grows
- Accumulates a `fillerWordsFound: Set<string>` and `fillerWordCount: number`

**Acoustic "um"/"uh" detection (Web Audio API):**
- Same `AnalyserNode` used for pause detection
- Detects short voiced bursts: RMS volume crosses above silence threshold, stays elevated for 0.1–0.8s, then drops back below threshold, with no new transcript text arriving during that window
- Each qualifying burst increments `acousticHesitationCount`
- **Fallback:** if acoustic detection is disabled or unreliable, `acousticHesitationCount` stays `0` — transcript-based fillers still reported

**Long pauses:**
- `AudioContext` + `AnalyserNode` polls mic stream at 10fps
- Silence defined as RMS volume < 0.01
- A silence gap >2s that occurs after the answer has started increments `longPauseCount`
- Gaps at the very start (<500ms into the answer) are ignored to avoid flagging the initial breath

**WPM:**
- Computed at `finalize()` only: `Math.round((wordCount / durationSeconds) * 60)`
- Returns `0` if `durationSeconds < 5` (too short to be meaningful)

### Interface

```ts
export type VerbalStatsResult = {
  filler_word_count: number;
  filler_words_found: string[];   // unique words, e.g. ["um", "like"]
  acoustic_hesitation_count: number;
  wpm: number;
  long_pause_count: number;
};

export class VerbalStats {
  addInterimResult(text: string): void;
  sampleAudio(analyserNode: AnalyserNode): void;  // called at 10fps
  finalize(finalTranscript: string): VerbalStatsResult;
  reset(): void;
}
```

---

## Integration — `answer-input.tsx`

`AnswerInput` owns the mic stream and speech recognizer. Changes:

1. **`VerbalStats` instance** — instantiated once, `reset()` called at the start of each question via a new `onQuestionStart` prop (or `useEffect` on a `questionKey` prop that changes per question).

2. **`AudioContext` setup** — created when `toggleMic()` starts the mic stream. The stream is connected to an `AnalyserNode`. A `requestAnimationFrame` loop (throttled to 10fps via a frame counter) calls `verbalStats.sampleAudio(analyserNode)` for both pause detection and acoustic hesitation detection. The loop is cancelled and `AudioContext` closed on mic stop or component unmount.

3. **Interim transcript forwarding** — the existing `createRecognizer` `onResult` callback already fires on every interim result. This callback additionally calls `verbalStats.addInterimResult(text)`.

4. **Updated `onSubmit` signature:**
```ts
onSubmit: (transcript: string, verbalStats: VerbalStatsResult) => void
```
`handleSubmit` calls `verbalStats.finalize(transcript)` before invoking `onSubmit`.

---

## Score-Answer API

### `src/lib/schemas/scored-answer.ts`

Add to `scores` object:
```ts
verbal_delivery: z.number(),
```

Add top-level field:
```ts
verbal_feedback: z.string().nullable(),
```

### `src/lib/prompts/score-answer.ts`

Add a verbal stats block to `SCORE_ANSWER_USER`, rendered when `verbalStats` is present:

```
Verbal delivery:
Filler words: 8 (like, you know, um)
Acoustic hesitations (um/uh): 3
Speaking pace: 147 WPM  (ideal: 120–160 WPM for interviews)
Long pauses: 2
```

Null when verbal stats unavailable (typed mode or `?cv=off`).

Add rubric for `verbal_delivery` in the scoring instructions:
- 9–10: fluent, confident pace (120–160 WPM), ≤2 filler words, no freezes
- 6–8: minor filler use or slight pace issues, still clear
- 3–5: noticeable fillers or pace problems that affect clarity
- 1–2: heavy filler use, erratic pace, or frequent freezes

`verbal_feedback`: one sentence referencing specific numbers (e.g. "You used 'like' 6 times and paused twice — try to slow down and breathe rather than filling silence."). `null` when no verbal stats available.

### `src/app/api/score-answer/route.ts`

Update `SCORE_FALLBACK` to include:
```ts
scores: { ...existing, verbal_delivery: 5 },
verbal_feedback: null,
```

---

## Score Report UI

**File:** `src/components/interview/score-report.tsx`

- `verbal_delivery` score appears automatically in the dimension scores list (no code change needed — `Object.entries(score.scores)` already iterates all keys)
- New "Verbal delivery" block rendered after the existing "Body language" block, only when `verbal_feedback` is non-null:

```
Verbal delivery                          [purple-400 label]
─────────────────────────────────────────
8 filler words (like, you know, um)  ·  147 WPM  ·  2 long pauses
"You used 'like' frequently and paused twice — try to slow down
and breathe instead of filling silence."  [italic gray-400]
```

Raw evidence row: `text-xs text-gray-500`
Feedback sentence: `text-xs text-gray-400 italic`

---

## Fallback Behavior

| Scenario | Behavior |
|---|---|
| `?cv=off` query param | CV stats disabled; verbal stats still collected via mic (mic is independent of camera) |
| Mic denied | Typed mode; no AudioContext; `verbalStats` not collected |
| `AudioContext` not supported | Pause detection and acoustic hesitation disabled; filler words + WPM still computed from transcript |
| Acoustic hesitation unreliable | Disable acoustic path, return `acoustic_hesitation_count: 0`; transcript fillers unaffected |
| Gemma returns no `verbal_feedback` | Section hidden (null check) |

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/scoring/verbal-stats.ts` | **New** — `VerbalStats` class |
| `src/components/interview/answer-input.tsx` | Wire `VerbalStats` + `AudioContext`; update `onSubmit` signature |
| `src/app/interview/[id]/page.tsx` | Pass `verbalStats` in score-answer POST body; update `handleSubmit` call site |
| `src/lib/schemas/scored-answer.ts` | Add `verbal_delivery` to scores + `verbal_feedback` field |
| `src/lib/prompts/score-answer.ts` | Add verbal stats block + rubric |
| `src/app/api/score-answer/route.ts` | Update fallback shape |
| `src/components/interview/score-report.tsx` | Add verbal delivery section |

---

## Revert Path (Approach A fallback)

If Web Audio pause/acoustic detection causes issues:
1. Remove `AudioContext` setup from `answer-input.tsx` (~10 lines)
2. In `VerbalStats.finalize()`, return `long_pause_count: 0` and `acoustic_hesitation_count: 0`

Everything else (schema, prompt, score report, WPM, transcript-based filler words) is identical between approaches and remains untouched.
