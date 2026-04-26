# Build Status

**Last updated:** 2026-04-26 — handoff after Phase 4 additions (Samson's session)
**Read order for a fresh Claude Code:** `CLAUDE.md` → this file → `docs/PLAN.md` → (drill into `docs/PRD.md` / `docs/MVP-SPEC.md` as needed)

## ✅ What's done — Phase 0: Scaffold hardening

- Default Next.js scaffold replaced with CareerPrep landing page (heading, privacy line, "Start a mock interview" CTA → `/setup`)
- shadcn/ui initialized: `style: "base-nova"` (**Base UI under the hood, NOT Radix** — `Button` has no `asChild` prop), `baseColor: "neutral"`
- shadcn primitives installed in `src/components/ui/`: `button`, `card`, `textarea`, `select`, `label`, `slider`, `sonner`, `badge`, `separator`
- `src/app/layout.tsx` — CareerPrep metadata, `<Toaster />` mount, Geist sans aligned to `--font-sans`
- `src/app/api/health/route.ts` — returns `{ ok: true }` (had a parse error from a stray `}` — fixed by Samson)
- `.env.local.example` — expanded with `GEMMA_MODEL_NAME`, three `ELEVENLABS_VOICE_*` keys, `BACKBOARD_API_KEY`, `NEXT_PUBLIC_DEMO_USER_ID`

## ✅ What's done — Phase 1: Gemma JD parsing + question generation

All Phase 1 files are complete and the full parse-JD → question-generation loop works end-to-end.

### Files created in Phase 1

- `src/lib/llm.ts` — Google AI client wrapper (`GoogleGenerativeAI` + `getGemmaModel`)
- `src/lib/llm-call.ts` — `callGemmaJSON` helper with Zod retry + fallback
- `src/lib/fallback-questions.json` — 10 hardcoded questions (behavioral, technical, system_design)
- `src/lib/personas.ts` — `encouraging_recruiter`, `strict_tech_lead`, `friendly_peer` constants with `systemTone` strings
- `src/lib/schemas/parsed-jd.ts` — `ParsedJdSchema` (Zod) + `PARSED_JD_RESPONSE_SCHEMA`
- `src/lib/schemas/interview-question.ts` — `InterviewQuestionSchema` + `INTERVIEW_QUESTION_RESPONSE_SCHEMA`
- `src/lib/schemas/scored-answer.ts` — `ScoredAnswerSchema` with `scores`, `overall`, `strengths`, `improvements`, `weak_competencies`, `non_verbal_feedback` (nullable), `memory_writeback` (nullable)
- `src/lib/prompts/parse-jd.ts` — `PARSE_JD_SYSTEM` + `PARSE_JD_USER(jdText)`
- `src/lib/prompts/next-question.ts` — `NEXT_QUESTION_SYSTEM` + `NEXT_QUESTION_USER(ctx)`
- `src/lib/prompts/score-answer.ts` — `SCORE_ANSWER_SYSTEM` + `SCORE_ANSWER_USER(ctx)`
- `src/app/api/parse-jd/route.ts` — POST, validates `jdText ≥ 50 chars`, calls `callGemmaJSON` with fallback to generic SWE profile
- `src/app/api/next-question/route.ts` — POST, requires `parsedJd` + `persona`, uses `fallbackQuestions[questionIndex % 10]` on LLM failure
- `src/app/setup/page.tsx` — `"use client"`, `useState` for jdText/persona/loading/parsed/error; `handleGenerate` calls `/api/parse-jd`; `handleStartInterview` writes `sessionStorage` and routes to `/interview/[sessionId]`
- `src/components/setup/jd-textarea.tsx`
- `src/components/setup/persona-picker.tsx`
- `src/components/setup/parsed-competencies.tsx`

## ✅ What's done — Phase 2: Webcam + MediaPipe heuristics bundle

All Phase 2 files are complete. Webcam shows in the interview room, posture + eye-contact gauges update live, `QuestionStats` accumulates per-question stats ready for the score bundle.

### Files created in Phase 2

- `src/lib/mediapipe/init.ts` — `initLandmarkers()`: loads `PoseLandmarker` + `FaceLandmarker` from Google CDN with GPU delegate. Uses `...({ refineLandmarks: true } as object)` spread cast to pass the option not in the 0.10.x TypeScript types.
- `src/lib/mediapipe/types.ts` — `PoseLandmarks`, `FaceLandmarks` type aliases
- `src/lib/scoring/posture.ts` — `postureScore(landmarks)` using NOSE (0), LEFT_SHOULDER (11), RIGHT_SHOULDER (12). `RollingScore` class: 30-sample (3s at 10fps) smoothing window.
- `src/lib/scoring/eye-contact.ts` — `EyeContactTracker`: iris centers (468 left, 473 right) vs eye corners (33/133, 362/263); looking at camera = both ratios 0.3–0.7.
- `src/lib/scoring/confidence.ts` — `compositeConfidence(posture, eyeContact)` = posture×0.4 + eyeContact×0.6
- `src/lib/scoring/question-stats.ts` — `QuestionStats` class with `sample()`, `finalize()`, `reset()`; produces `{ posture_avg, eye_contact_pct, slouch_seconds, look_away_count, duration_seconds }`
- `src/components/interview/permissions-gate.tsx` — requests `video+audio`, shows error on denial, "Skip CV" link appends `?cv=off`
- `src/components/interview/webcam-view.tsx` — `<video>` sets `srcObject` in `useEffect`, `playsInline muted autoPlay`
- `src/components/interview/confidence-gauges.tsx` — two `GaugeCard` components; green ≥70%, yellow ≥40%, red <40%
- `src/components/interview/tracking-loop.tsx` — `"use client"`; `FRAME_SKIP = 3` (10fps from 30fps rAF); initializes landmarkers async; feeds `questionStats.sample()` and calls `onPostureChange`/`onEyeContactChange`; cleanup cancels rAF and closes landmarkers

## ✅ What's done — Phase 3: ElevenLabs voice + answer loop

All Phase 3 files are complete and wired. Full interview cycle works: question spoken → user answers → CV stats + transcript bundled → Gemma scores → next question → repeat → score report.

### Files created in Phase 3

- `src/lib/interview-state.ts` — `InterviewStatus` type union + `InterviewState` type
- `src/lib/speech-recognition.ts` — Web Speech API wrapper; `onerror` → typed fallback
- `src/app/api/tts/route.ts` — **`export const runtime = "edge"`** (mandatory). Streams ElevenLabs response body directly. Falls back gracefully to 502 when voice IDs are unconfigured.
- `src/app/api/score-answer/route.ts` — receives `{ question, targets, transcript, stats, roleTitle, seniority, accessibilityMode }`; calls `callGemmaJSON` with `ScoredAnswerSchema` and flat-50 fallback shape
- `src/components/interview/audio-player.tsx` — `useTTS(persona, mode)` hook; ElevenLabs by default, falls through to `window.speechSynthesis` on `?tts=browser` or fetch failure
- `src/components/interview/answer-input.tsx` — mic button + textarea (textarea always renders; mic auto-fills it). `micSupported` flag hides mic button if Web Speech API unavailable.
- `src/components/interview/question-panel.tsx` — renders question text + status-appropriate UI per state machine status
- `src/components/interview/thinking-indicator.tsx` — three-dot bounce for Gemma latency bridge
- `src/components/interview/score-report.tsx` — overall score, per-question dimension scores + strengths/improvements/CV feedback

### Modified in Phase 3

- `src/app/interview/[id]/page.tsx` — full state machine wired:
  - `loading_intro` → fetches next question from `/api/next-question`
  - `speaking_question` → calls `useTTS`, advances to `awaiting_answer` on TTS end
  - `awaiting_answer` → shows `QuestionPanel` with `AnswerInput`
  - `scoring_answer` → finalizes `QuestionStats`, POSTs to `/api/score-answer`, loops (max 5 questions) or ends
  - `show_report` → renders `ScoreReport`
  - State mirrored to `sessionStorage` on every change; restored on mount (refresh-safe)
  - `?cv=off` and `?tts=browser` flags both handled

### Bugs fixed / incidents in Phase 3 session

**API key leak (critical):**
Real `GOOGLE_AI_KEY` and `ELEVENLABS_API_KEY` values were accidentally committed to `.env.local.example` (not `.env.local`) in earlier commits. GitHub secret scanning detected them and Google revoked the key. Fixed: `.env.local.example` now has placeholder strings only. **Both keys must be rotated** — the old ones are burned.

**Model reset to `gemma-3-4b-it`:**
The `.env.local.example` and `src/lib/llm.ts` fallback had drifted to `gemma-4-26b-a4b-it` during a merge. Restored to `gemma-3-4b-it` (the model that was working).

**JSON mode removed:**
`gemma-3-4b-it` does not support `responseMimeType: "application/json"`. Removed from both `getGemmaModel()` in `src/lib/llm.ts` and the `generateContent` call in `src/lib/llm-call.ts`. The existing `extractJSON()` helper handles parsing JSON from free-form responses. `responseSchema` also removed from model config (only valid with JSON mode).

**`FLASH_MODEL` removed:**
All calls now go through a single model (`gemma-3-4b-it`). `FLASH_MODEL` export deleted from `src/lib/llm.ts`, import + `model:` override removed from both `parse-jd/route.ts` and `score-answer/route.ts`. `FLASH_MODEL_NAME` removed from `.env.local.example`.

## ✅ What's done — Phase 4: Polish + dashboard + ElevenLabs on

Dashboard is live, sessions persist across page reloads, ElevenLabs voice plays per persona, global header navigates between pages.

### Files created in Phase 4

- `src/lib/session-store.ts` — `listSessions()` + `saveSession()` + `getSession()`. Backed by `localStorage` (`careerprep:sessions`), capped at 50 entries, try/catch around all reads/writes (returns `[]` / no-op on quota or parse failure).
- `src/components/dashboard/session-card.tsx` — glass card with date, role, persona label, score (green/amber/red threshold reused from `score-report.tsx`), and weak-competency badges (shadcn `<Badge>` outline variant).
- `src/components/dashboard/trend-chart.tsx` — Recharts `<LineChart>` in a `<ResponsiveContainer>`. X-axis = sessions sorted oldest→newest; Y-axis = `overall_score 0–100`. Empty-state message when 0 sessions; renders a single dot if 1.
- `src/app/dashboard/page.tsx` — `"use client"` (because `session-store` reads `localStorage`). Empty state CTA → `/setup`. List + chart when ≥1 session.
- `src/components/site-header.tsx` — `"use client"`. Fixed top header with brand + Sessions + New Interview links. **Hidden on `/interview/*` routes** via `usePathname()` check (the interview room has its own internal Exit button — a global header would clash).

### Files modified in Phase 4

- `src/components/interview/score-report.tsx` — new props `roleTitle`, `persona`. "Save session" primary button (disables → "Saved" after click, then `router.push("/dashboard")`). Aggregates `weak_competencies` across all per-question scores. Demoted "Start new interview" to a subtle text link.
- `src/app/interview/[id]/page.tsx` — passes `roleTitle` + `persona` to `<ScoreReport>` with the same fallbacks already used in the score-answer POST body (`"Software Engineer"` / `"encouraging_recruiter"`).
- `src/app/layout.tsx` — mounts `<SiteHeader />`, updates metadata title to `"NodeBud — CareerPrep AI"`.
- `src/app/page.tsx` — adds "View past sessions →" secondary link below primary CTA.
- `src/app/api/tts/route.ts` — adds detailed error response body (status + ElevenLabs body) and `console.warn` logging on failure paths. Helps future debugging without touching the route.
- `.env.local.example` — leaked key replaced with placeholder; `GEMMA_MODEL_NAME` reset to `gemma-3-4b-it`; `FLASH_MODEL_NAME` deleted; stray `be48207` line removed.
- `package.json` / `package-lock.json` — adds `recharts` dependency.

### Bugs fixed / incidents in Phase 4 session

**ElevenLabs `category: professional` voices fail with 402 on free tier.**
Initial voice IDs were copied from the ElevenLabs Voice Library — these are `category: "professional"` (community/curated) voices. Free-tier API rejects them with `402 Payment Required {"detail":{"code":"paid_plan_required","message":"Free users cannot use library voices via the API"}}`. Fix: use `category: "premade"` voices only (the built-in defaults like Sarah, Daniel, Will). Verify by GET `https://api.elevenlabs.io/v1/voices` with the API key — each entry has a `category` field. See CLAUDE.md "Stack-specific gotchas" for permanent note.

**Edge runtime `console.warn` doesn't surface in dev terminal.**
Workaround: include diagnostic info in the HTTP response body so it's visible in DevTools → Network → Response. The TTS route now does both (warn + body) so either approach works depending on environment.

## ✅ What's done — Phase 4.5: Verbal delivery metrics

Verbal delivery metrics are fully wired end-to-end. Filler word detection, speaking pace (WPM), long pauses, and acoustic hesitation are collected client-side and fed to Gemma as a new scoring dimension. Results surface in the score report.

### Files created in Phase 4.5

- `src/lib/scoring/verbal-stats.ts` — `VerbalStats` class: `addInterimResult()` scans each interim Speech API result for filler words (um, uh, like, you know, basically, right, so) without double-counting; `sampleAudio(analyser)` detects long pauses (>2s, grace period 500ms) and acoustic hesitations (short RMS bursts 0.1–0.8s with no new transcript); `finalize(transcript)` computes WPM (0 if <5s duration); `reset()` for per-question reuse. Exports `VerbalStatsResult` type.

### Files modified in Phase 4.5

- `src/components/interview/answer-input.tsx` — instantiates `VerbalStats`; `startAudio()` creates `AudioContext` + `AnalyserNode` when mic starts and runs a 10fps rAF loop calling `sampleAudio`; `addInterimResult` called on every interim Speech API callback; `handleSubmit` calls `finalize()` (or returns `null` if mic was never used); `onSubmit` signature updated to `(transcript, verbalStats: VerbalStatsResult | null)`. Cleanup tears down `AudioContext` and cancels rAF on unmount/stop.
- `src/lib/schemas/scored-answer.ts` — added `verbal_delivery` to `scores` object; added `verbal_feedback: z.string().nullish().catch(null)` top-level field.
- `src/lib/prompts/score-answer.ts` — added `verbalStats` to `ScoreContext` type; renders verbal delivery block (filler count, acoustic hesitations, WPM, long pauses) in `SCORE_ANSWER_USER`; added `verbal_delivery` rubric (9-10 fluent, 6-8 minor issues, 3-5 noticeable, 1-2 heavy); `verbal_feedback` instruction in JSON spec.
- `src/app/api/score-answer/route.ts` — `SCORE_FALLBACK` updated with `verbal_delivery: 5` and `verbal_feedback: null`.
- `src/components/interview/score-report.tsx` — added `verbalStatsList` prop; "Verbal delivery" section renders after "Body language" when `score.verbal_feedback` is non-null: raw stats row (filler count + words, hesitations, WPM, pause count) in `text-xs text-gray-500`, Gemma feedback sentence in `text-xs text-gray-400 italic`, label in `text-xs font-semibold text-purple-400`.
- `src/app/interview/[id]/page.tsx` — already had `verbalStats` / `pendingVerbalStatsRef` / `verbalStatsListRef` wired from Phase 3; updated `handleAnswerSubmit` signature to accept `VerbalStatsResult | null`; passes `verbalStatsList` to `<ScoreReport>`.

### Design docs created in Phase 4.5

- `docs/superpowers/specs/2026-04-26-verbal-delivery-metrics-design.md` — full design spec (approved before implementation).
- `docs/superpowers/plans/2026-04-26-verbal-delivery-metrics.md` — implementation plan.

## ▶️ What's next — Phase 4.5 (gated) OR Phase 5 (submission)

**Phase 4.5 (Backboard) is gated.** Per `docs/PLAN.md` § Phase 4.5, only proceed if at hour 18 ALL of:

- Production deploy is live and stable
- Full interview loop works end-to-end
- Dashboard with seeded data renders cleanly
- Demo video script is drafted
- No blocking bugs

If any are false, **skip to Phase 5**.

**Phase 5 (Devpost + demo video):** see `docs/MVP-SPEC.md` § Phase 5. Critical: writeup MUST say **"Gemma 4 via the Google Gemini API"** verbatim (Tier 1 prize criterion). Record a backup video Sunday morning.

## Branch / env state (2026-04-26, end of Phase 4.5 session)

- Samson on branch `sam`. Phase 4.5 verbal delivery metrics committed.
- `npm run build` passes cleanly (no new dependencies added — Web Audio API and AudioContext are browser built-ins).
- `.env.local` working: ElevenLabs voice plays for all three personas using `premade` voice IDs.
- `.env.local.example` no longer leaks any keys.

## ⚠️ Outstanding before next session

- **🟠 Rotate `GOOGLE_AI_KEY`** — the value currently in `.env.local` matches the one previously flagged as leaked. Whether or not Google actually revoked it, treat as compromised. Rotate AFTER demo, not before (avoid mid-demo failures).
- **🟠 Rotate `ELEVENLABS_API_KEY`** — current value was visible in chat transcripts during Phase 4 debugging. Rotate AFTER demo.
- **Run seed-data console snippet** from `docs/PLAN.md` § Phase 4 on demo laptop Saturday night (now Sunday) so the trend chart looks lived-in.
- **Rehearse the demo end-to-end at least twice** — once normal, once with `?cv=off` and `?tts=browser` as fallback drills (PRD §10.5).
- **Pre-record a backup demo video** Sunday morning (PRD §11 universal — absolute fallback).

## Don't forget (rules from PRD/spec)

- **Do not push to `master`** without team confirmation.
- **Do not introduce** Ollama, LangChain, Zustand, or Auth0 — excluded by team agreement.
- **MediaPipe at 10fps** (`FRAME_SKIP = 3`), never 30fps.
- **`/api/tts` uses `export const runtime = "edge"`** — streaming breaks without it.
- **`gemma-3-4b-it` does not support JSON mode.** Do not add `responseMimeType: "application/json"` back. Use `extractJSON()` + Zod validation instead.
- **Devpost copy must say "Gemma 4 via the Google Gemini API"** verbatim — Tier 1 prize criterion.
- **Backboard is hour-18 gated.** Skip entirely if Phases 0-4 aren't all green by then.
