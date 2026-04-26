# Build Status

**Last updated:** 2026-04-25 — handoff after Phase 3 (Samson's session)
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

## ▶️ What's next — Phase 4: Polish + dashboard + ElevenLabs on

Full plan: `docs/PLAN.md` § Phase 4. Summary:

1. **`src/lib/session-store.ts`** — `listSessions()` + `saveSession()` capped at 50 entries, backed by `localStorage`
2. **`src/app/dashboard/page.tsx`** — session history page
3. **`src/components/dashboard/trend-chart.tsx`** — Recharts line chart (`npm install recharts`)
4. **`src/components/dashboard/session-card.tsx`** — shadcn `<Card>` with date / role / score / "View Details"
5. **Modify `src/components/interview/score-report.tsx`** — add "Save Session" button
6. **Modify `src/app/page.tsx`** — add dashboard link
7. **Modify `src/app/layout.tsx`** — header bar with brand + dashboard link
8. **ElevenLabs flip-on** — fill in `ELEVENLABS_VOICE_ENCOURAGING/STRICT/PEER` in `.env.local`, verify quota, remove any `?tts=browser` dev defaults
9. **Seed data** — run the console snippet from `docs/PLAN.md` § Phase 4 on demo laptop Saturday night

## Branch / env state (2026-04-25, end of Phase 3 session)

- Samson worked on branch `sam`. Phases 1–3 files exist but are **not yet committed** (all untracked).
- `npm run build` passes cleanly as of Phase 3 completion.
- `.env.local` on Samson's machine: **GOOGLE_AI_KEY is the leaked/revoked key — must be replaced with a new key before the app will work.** `GEMMA_MODEL_NAME=gemma-3-4b-it`. `FLASH_MODEL_NAME` line should be deleted.
- Three `ELEVENLABS_VOICE_*` keys are still blank → TTS falls back to browser `speechSynthesis`. Fill these in during Phase 4.
- `package.json` dev script now has `--webpack` flag (`"next dev --webpack"`) — required on Windows paths with spaces. This was already on `sam`; also applied to `master` during merge conflict resolution.

## ⚠️ Outstanding before next session

- **🔴 Replace GOOGLE_AI_KEY** — old key is revoked. Generate a new one at `aistudio.google.com` and update `.env.local`.
- **🔴 Replace ELEVENLABS_API_KEY** — old key was also committed and may be compromised. Generate a new one in the ElevenLabs dashboard and update `.env.local`.
- **Commit all Phase 3 files** — everything in `src/` is untracked. Stage and commit to `sam` branch.
- Delete `FLASH_MODEL_NAME` line from `.env.local` (no longer used).

## Don't forget (rules from PRD/spec)

- **Do not push to `master`** without team confirmation.
- **Do not introduce** Ollama, LangChain, Zustand, or Auth0 — excluded by team agreement.
- **MediaPipe at 10fps** (`FRAME_SKIP = 3`), never 30fps.
- **`/api/tts` uses `export const runtime = "edge"`** — streaming breaks without it.
- **`gemma-3-4b-it` does not support JSON mode.** Do not add `responseMimeType: "application/json"` back. Use `extractJSON()` + Zod validation instead.
- **Devpost copy must say "Gemma 4 via the Google Gemini API"** verbatim — Tier 1 prize criterion.
- **Backboard is hour-18 gated.** Skip entirely if Phases 0-4 aren't all green by then.
