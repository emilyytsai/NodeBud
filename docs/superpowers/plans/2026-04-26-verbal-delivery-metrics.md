# Verbal Delivery Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add filler word detection, WPM, and long pause tracking to the interview scoring pipeline, surfacing results as a new `verbal_delivery` score dimension and dedicated section in the score report.

**Architecture:** A new `VerbalStats` class (mirroring `QuestionStats`) tracks verbal metrics client-side during answer recording using Web Speech API interim results (filler words, WPM) and Web Audio API `AnalyserNode` (long pauses, acoustic "um"/"uh" hesitations). Results are finalized at submit time and bundled with CV stats into the existing `/api/score-answer` POST body. Gemma scores a new `verbal_delivery` dimension (1–10) and returns `verbal_feedback` text, both displayed in a new score report section.

**Tech Stack:** Web Audio API (`AudioContext`, `AnalyserNode`), Web Speech API (already wired), TypeScript, Zod, Next.js App Router, React, Tailwind v4.

---

## File Map

| File | Action |
|---|---|
| `src/lib/scoring/verbal-stats.ts` | **Create** — `VerbalStats` class + `VerbalStatsResult` type |
| `src/lib/schemas/scored-answer.ts` | **Modify** — add `verbal_delivery` to scores, add `verbal_feedback` field |
| `src/lib/prompts/score-answer.ts` | **Modify** — add verbal block to prompt, add rubric for new dimension |
| `src/app/api/score-answer/route.ts` | **Modify** — update `SCORE_FALLBACK` |
| `src/components/interview/answer-input.tsx` | **Modify** — wire `VerbalStats` + `AudioContext`, update `onSubmit` signature |
| `src/app/interview/[id]/page.tsx` | **Modify** — store verbal stats per answer, pass to POST body + score report |
| `src/components/interview/score-report.tsx` | **Modify** — add verbal delivery section with raw evidence + feedback |

---

## Task 1: Create `VerbalStats` class

**Files:**
- Create: `src/lib/scoring/verbal-stats.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/scoring/verbal-stats.ts

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors. (DOM types like `AnalyserNode` and `Float32Array` are available via Next.js's default `tsconfig.json` which includes `"lib": ["dom", "dom.iterable", "esnext"]`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring/verbal-stats.ts
git commit -m "feat: add VerbalStats class for filler word, WPM, and pause tracking"
```

---

## Task 2: Update schema, prompt, and route fallbacks

**Files:**
- Modify: `src/lib/schemas/scored-answer.ts`
- Modify: `src/lib/prompts/score-answer.ts`
- Modify: `src/app/api/score-answer/route.ts`

- [ ] **Step 1: Update `scored-answer.ts` — add `verbal_delivery` dimension and `verbal_feedback` field**

Replace the entire file content:

```typescript
// src/lib/schemas/scored-answer.ts
import { z } from "zod";

export const ScoredAnswerSchema = z.object({
  scores: z.object({
    content_relevance: z.number(),
    technical_accuracy: z.number(),
    structure: z.number(),
    specificity: z.number(),
    communication: z.number(),
    verbal_delivery: z.number(),
  }),
  overall: z.number(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  weak_competencies: z.array(z.string()),
  non_verbal_feedback: z.string().nullable(),
  verbal_feedback: z.string().nullable(),
  memory_writeback: z
    .object({
      competency: z.string(),
      evidence: z.string(),
      confidence: z.number(),
    })
    .nullable(),
});

export type ScoredAnswer = z.infer<typeof ScoredAnswerSchema>;

export const SCORED_ANSWER_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        content_relevance: { type: "number" },
        technical_accuracy: { type: "number" },
        structure: { type: "number" },
        specificity: { type: "number" },
        communication: { type: "number" },
        verbal_delivery: { type: "number" },
      },
      required: [
        "content_relevance",
        "technical_accuracy",
        "structure",
        "specificity",
        "communication",
        "verbal_delivery",
      ],
    },
    overall: { type: "number" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    weak_competencies: { type: "array", items: { type: "string" } },
    non_verbal_feedback: { type: "string", nullable: true },
    verbal_feedback: { type: "string", nullable: true },
    memory_writeback: {
      type: "object",
      nullable: true,
      properties: {
        competency: { type: "string" },
        evidence: { type: "string" },
        confidence: { type: "number" },
      },
    },
  },
  required: ["scores", "overall", "strengths", "improvements", "weak_competencies"],
};
```

- [ ] **Step 2: Update `score-answer.ts` (prompt) — add verbal stats block, update scoring instructions**

Replace the entire file content:

```typescript
// src/lib/prompts/score-answer.ts
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";

type ScoreContext = {
  question: string;
  targets: string[];
  transcript: string;
  stats: {
    posture_avg: number | null;
    eye_contact_pct: number | null;
    slouch_seconds: number;
    look_away_count: number;
    duration_seconds: number;
  } | null;
  verbalStats?: VerbalStatsResult | null;
  roleTitle: string;
  seniority: string;
  accessibilityMode: boolean;
};

export const SCORE_ANSWER_SYSTEM = `You are an expert interview coach evaluating a candidate's answer. Score each dimension 1-10. Be specific in feedback, referencing what the candidate actually said. Return only valid JSON.`;

export function SCORE_ANSWER_USER(ctx: ScoreContext): string {
  const cvLine =
    ctx.accessibilityMode || !ctx.stats
      ? "(CV data not available — accessibility mode)"
      : `Posture average: ${ctx.stats.posture_avg ?? "N/A"}/100
Eye contact: ${ctx.stats.eye_contact_pct ?? "N/A"}%
Slouching: ${ctx.stats.slouch_seconds}s
Times looked away: ${ctx.stats.look_away_count}`;

  const verbalLine = ctx.verbalStats
    ? `Filler words: ${ctx.verbalStats.filler_word_count}${
        ctx.verbalStats.filler_words_found.length > 0
          ? ` (${ctx.verbalStats.filler_words_found.join(", ")})`
          : ""
      }
Acoustic hesitations (um/uh): ${ctx.verbalStats.acoustic_hesitation_count}
Speaking pace: ${ctx.verbalStats.wpm > 0 ? `${ctx.verbalStats.wpm} WPM` : "unavailable"} (ideal: 120–160 WPM for interviews)
Long pauses (>2s): ${ctx.verbalStats.long_pause_count}`
    : "(Verbal data not available)";

  return `Role: ${ctx.roleTitle} (${ctx.seniority})
Question: ${ctx.question}
Competencies tested: ${ctx.targets.join(", ")}

Candidate's answer:
"${ctx.transcript || "(no answer given)"}"

Non-verbal signals:
${cvLine}

Verbal delivery signals:
${verbalLine}

Score this answer. Return JSON with:
- scores: { content_relevance, technical_accuracy, structure, specificity, communication, verbal_delivery } — each 1-10
  verbal_delivery rubric: 9-10 = fluent, confident pace (120-160 WPM), ≤2 fillers, no freezes; 6-8 = minor filler use or slight pace issues; 3-5 = noticeable fillers or pace problems; 1-2 = heavy fillers, erratic pace, or frequent freezes
- overall: weighted average score 0-100
- strengths: array of 1-3 specific strengths (quote the candidate where possible)
- improvements: array of 1-3 specific improvements
- weak_competencies: array of competency names the candidate struggled with
- non_verbal_feedback: one sentence about posture/eye contact, or null if CV disabled
- verbal_feedback: one sentence referencing specific verbal delivery numbers (e.g. filler count, WPM), or null if verbal data unavailable
- memory_writeback: { competency, evidence, confidence } if there's a notable weak area, else null`;
}
```

- [ ] **Step 3: Update `route.ts` — add `verbal_delivery` and `verbal_feedback` to fallback**

In `src/app/api/score-answer/route.ts`, replace `SCORE_FALLBACK`:

```typescript
const SCORE_FALLBACK = {
  scores: {
    content_relevance: 5,
    technical_accuracy: 5,
    structure: 5,
    specificity: 5,
    communication: 5,
    verbal_delivery: 5,
  },
  overall: 50,
  strengths: ["You completed the question."],
  improvements: ["Try to give a more specific example next time."],
  weak_competencies: [],
  non_verbal_feedback: null,
  verbal_feedback: null,
  memory_writeback: null,
};
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas/scored-answer.ts src/lib/prompts/score-answer.ts src/app/api/score-answer/route.ts
git commit -m "feat: add verbal_delivery score dimension and verbal_feedback to scoring schema and prompt"
```

---

## Task 3: Wire `VerbalStats` into `answer-input.tsx`

**Files:**
- Modify: `src/components/interview/answer-input.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
// src/components/interview/answer-input.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { createRecognizer } from "@/lib/speech-recognition";
import { VerbalStats } from "@/lib/scoring/verbal-stats";
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";

interface AnswerInputProps {
  onSubmit: (transcript: string, verbalStats: VerbalStatsResult) => void;
  disabled?: boolean;
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [transcript, setTranscript] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [focused, setFocused] = useState(false);

  const recognizerRef = useRef<any>(null);
  const verbalStatsRef = useRef(new VerbalStats());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) setMicSupported(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopAudio = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    rafRef.current = null;
  };

  const startAudio = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(micStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      let frameCount = 0;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        frameCount++;
        if (frameCount % 3 !== 0) return; // throttle to ~10fps
        if (analyserRef.current) {
          verbalStatsRef.current.sampleAudio(analyserRef.current);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // AudioContext unavailable — filler words + WPM still work via transcript
    }
  };

  const toggleMic = async () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
      stopAudio();
      return;
    }
    const r = createRecognizer(
      (text) => {
        setTranscript(text);
        verbalStatsRef.current.addInterimResult(text);
      },
      () => {
        setMicActive(false);
        setMicSupported(false);
        stopAudio();
      }
    );
    if (!r) { setMicSupported(false); return; }
    recognizerRef.current = r;
    r.start();
    setMicActive(true);
    await startAudio();
  };

  const handleSubmit = () => {
    if (micActive) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setMicActive(false);
      stopAudio();
    }
    const verbalResult = verbalStatsRef.current.finalize(transcript);
    onSubmit(transcript, verbalResult);
    setTranscript("");
  };

  return (
    <div className="space-y-3">
      <textarea
        className="glass-input w-full rounded-xl p-3 text-amber-100 placeholder:text-gray-500 resize-none min-h-[100px] focus:outline-none transition-all duration-200"
        style={{
          border: focused
            ? '2.5px solid rgba(255, 255, 255, 0.8)'
            : '1px solid rgba(255, 255, 255, 0.7)',
        }}
        placeholder={micActive ? "Listening… speak your answer" : "Type your answer or use the mic"}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
      />
      <div className="flex gap-2">
        {micSupported && (
          <button
            onClick={toggleMic}
            disabled={disabled}
            className={`shrink-0 w-16 py-2 rounded-lg text-xs border transition-all duration-200 text-center hover:-translate-y-1 ${
              micActive
                ? "bg-red-500/30 border-red-400/70 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                : "border-white/60 text-amber-100 bg-amber-100/5 hover:bg-amber-100/15 hover:border-amber-100/70 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]"
            }`}
          >
            {micActive ? (
              <span>⏹ Stop<br />mic</span>
            ) : "🎤 Mic"}
          </button>
        )}
        <div className="btn-wrapper flex-1">
          <button
            onClick={handleSubmit}
            disabled={disabled || !transcript.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: '1px solid rgba(255, 255, 255, 0.4)' }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: No TypeScript errors. The build may flag `AnswerInput` callers that pass the old `onSubmit` signature — that's expected and will be fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/answer-input.tsx
git commit -m "feat: wire VerbalStats and AudioContext into AnswerInput"
```

---

## Task 4: Update interview page to store and pass verbal stats

**Files:**
- Modify: `src/app/interview/[id]/page.tsx`

- [ ] **Step 1: Add import, ref, and update `handleAnswerSubmit`**

Add `VerbalStatsResult` import at the top of the file (after the existing imports):

```typescript
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
```

Add a ref alongside `questionStatsRef` (after line `const questionStatsRef = useRef(new QuestionStats());`):

```typescript
const verbalStatsListRef = useRef<(VerbalStatsResult | null)[]>([]);
const pendingVerbalStatsRef = useRef<VerbalStatsResult | null>(null);
```

Replace `handleAnswerSubmit`:

```typescript
const handleAnswerSubmit = useCallback((transcript: string, verbalStats: VerbalStatsResult) => {
  pendingVerbalStatsRef.current = verbalStats;
  setIstate(s => ({ ...s, answers: [...s.answers, transcript], status: "scoring_answer" }));
}, []);
```

- [ ] **Step 2: Update `SCORE_FALLBACK` in the interview page**

Replace the `SCORE_FALLBACK` constant near the top of the file (lines 25–33):

```typescript
const SCORE_FALLBACK = {
  scores: { content_relevance: 5, technical_accuracy: 5, structure: 5, specificity: 5, communication: 5, verbal_delivery: 5 },
  overall: 50,
  strengths: ["You completed the question."],
  improvements: ["Try to give a more specific example next time."],
  weak_competencies: [],
  non_verbal_feedback: null,
  verbal_feedback: null,
  memory_writeback: null,
};
```

- [ ] **Step 3: Update the `scoring_answer` `useEffect` to include `verbalStats` in the POST body and store the result**

Replace the `scoring_answer` useEffect (the one starting at `if (istate.status !== "scoring_answer") return;`):

```typescript
useEffect(() => {
  if (istate.status !== "scoring_answer") return;
  const { questionIndex, questions, answers } = istate;

  if (scoreGuardRef.current === questionIndex) return;
  scoreGuardRef.current = questionIndex;

  const currentQ = questions[questionIndex];
  const transcript = answers[questionIndex] ?? "";
  const stats = cvDisabled ? null : questionStatsRef.current.finalize();
  const verbalStats = pendingVerbalStatsRef.current;

  fetch("/api/score-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: currentQ?.question ?? "",
      targets: currentQ?.targets ?? [],
      transcript,
      stats,
      verbalStats,
      roleTitle: setup?.parsed?.role_title ?? "Software Engineer",
      seniority: setup?.parsed?.seniority ?? "mid",
      accessibilityMode: cvDisabled,
    }),
  })
    .then(r => r.json())
    .catch(() => SCORE_FALLBACK)
    .then(score => {
      const nextIndex = questionIndex + 1;
      questionStatsRef.current.reset();
      verbalStatsListRef.current = [...verbalStatsListRef.current, verbalStats];
      pendingVerbalStatsRef.current = null;
      setIstate(s => {
        const newScores = [...s.scores, score];
        return nextIndex < MAX_QUESTIONS
          ? { ...s, scores: newScores, questionIndex: nextIndex, status: "loading_intro" }
          : { ...s, scores: newScores, status: "show_report" };
      });
    });
}, [istate.status, istate.questionIndex, cvDisabled, setup]);
```

- [ ] **Step 4: Pass `verbalStatsList` to `ScoreReport`**

Find the `<ScoreReport ... />` JSX and update it to pass the new prop:

```tsx
<ScoreReport
  questions={istate.questions}
  answers={istate.answers}
  scores={istate.scores}
  verbalStatsList={verbalStatsListRef.current}
  roleTitle={setup?.parsed?.role_title ?? "Software Engineer"}
  persona={setup?.persona ?? "encouraging_recruiter"}
/>
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: TypeScript error on `ScoreReport` about unknown prop `verbalStatsList` — that will be fixed in Task 5. All other errors should be gone.

- [ ] **Step 6: Commit**

```bash
git add src/app/interview/[id]/page.tsx
git commit -m "feat: store verbal stats per answer and pass to score-answer API"
```

---

## Task 5: Add verbal delivery section to score report

**Files:**
- Modify: `src/components/interview/score-report.tsx`

- [ ] **Step 1: Add import and prop**

Add import at the top of the file (after existing imports):

```typescript
import type { VerbalStatsResult } from "@/lib/scoring/verbal-stats";
```

Update `ScoreReportProps` to include the new prop:

```typescript
interface ScoreReportProps {
  questions: InterviewQuestion[];
  answers: string[];
  scores: ScoredAnswer[];
  verbalStatsList?: (VerbalStatsResult | null)[];
  roleTitle: string;
  persona: PersonaId;
}
```

Update the function signature to destructure the new prop:

```typescript
export function ScoreReport({ questions, answers, scores, verbalStatsList, roleTitle, persona }: ScoreReportProps) {
```

- [ ] **Step 2: Add the verbal delivery section inside the per-question loop**

Inside the `scores.map((score, i) => ...)` block, after the existing `{score.non_verbal_feedback && ...}` block, add:

```tsx
{score.verbal_feedback && (
  <div className="border-t border-white/10 pt-3">
    <div className="text-xs font-semibold text-purple-400 mb-1">Verbal delivery</div>
    {verbalStatsList?.[i] && (
      <p className="text-xs text-gray-500 mb-1">
        {verbalStatsList[i]!.filler_word_count} filler word{verbalStatsList[i]!.filler_word_count !== 1 ? "s" : ""}
        {verbalStatsList[i]!.filler_words_found.length > 0
          ? ` (${verbalStatsList[i]!.filler_words_found.join(", ")})`
          : ""}
        {" · "}
        {verbalStatsList[i]!.wpm > 0 ? `${verbalStatsList[i]!.wpm} WPM` : "pace unavailable"}
        {" · "}
        {verbalStatsList[i]!.long_pause_count} long pause{verbalStatsList[i]!.long_pause_count !== 1 ? "s" : ""}
      </p>
    )}
    <p className="text-xs text-gray-400 italic leading-relaxed">{score.verbal_feedback}</p>
  </div>
)}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: Clean build, zero TypeScript errors across all files.

- [ ] **Step 4: Commit**

```bash
git add src/components/interview/score-report.tsx
git commit -m "feat: add verbal delivery section to score report"
```

---

## Task 6: End-to-end manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Run through a full interview with mic enabled**

1. Go to `http://localhost:3000/setup`
2. Paste any job description (>50 chars), pick any persona, click Generate
3. Click Start Interview, grant camera + mic
4. When the question plays, click the mic button and speak an answer. Deliberately say "um", "like", and "you know" a few times. Pause for 3 seconds mid-answer at least once.
5. Click Submit
6. After scoring completes and the next question plays, repeat for 1-2 more questions
7. Let the interview end (or complete all questions)

Expected on score report:
- `verbal delivery` appears as a row in the dimension scores list for each question
- A "Verbal delivery" section appears below "Body language" (if CV is on) with the raw evidence line (filler count, WPM, pause count) and Gemma's feedback sentence

- [ ] **Step 3: Test the typed-answer fallback**

Reload with `?cv=off` appended to the URL. Complete one question by typing (no mic). Confirm the "Verbal delivery" section does **not** appear (since `verbal_feedback` will be null when no verbal stats are available).

- [ ] **Step 4: Test mic-denied fallback**

In Chrome DevTools → Application → Permissions, revoke mic. Reload and try to start. The textarea should focus automatically. Submit a typed answer. Confirm no crashes and no "Verbal delivery" section (graceful degradation).

- [ ] **Step 5: Revert path test (optional — only if Web Audio is causing issues)**

If the AudioContext is causing crashes or noisy hesitation counts:
1. In `src/lib/scoring/verbal-stats.ts`, in `sampleAudio`, add `return;` as the first line to disable all audio analysis
2. In `src/components/interview/answer-input.tsx`, in `startAudio`, you can remove the `sampleAudio` call from the loop

Filler words (transcript-based) and WPM will still work correctly.

- [ ] **Step 6: Final build check**

```bash
npm run build
```

Expected: Clean production build with no TypeScript or routing errors.
