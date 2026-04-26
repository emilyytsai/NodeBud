# Build Status

**Last updated:** 2026-04-25 — Brian's session, post-Phase-2-merge cleanup
**Read order for a fresh Claude Code:** `CLAUDE.md` → this file → `docs/PLAN.md` → (drill into `docs/PRD.md` / `docs/MVP-SPEC.md` as needed)

## 🛠️ Brian's session (2026-04-25, after Samson's Phase 2 merge to `brian`)

This session was cleanup, not feature work. Phase 3 has not started yet.

### What changed

- **Gemma 4 model alignment.** Default model name was still `gemma-2-9b-it` in `src/lib/llm.ts:5` and `.env.local.example` (leftover from Phase 0). Forfeits the Gemma 4 prize on any clean checkout that doesn't override `GEMMA_MODEL_NAME`. Updated to `gemma-4-26b-a4b-it` everywhere (`src/lib/llm.ts`, `.env.local.example`, `CLAUDE.md`, `docs/MVP-SPEC.md`, `docs/PLAN.md`, `docs/STATUS.md`).
- **Leaked API key in `.env.local.example`.** Committed file had a real `GOOGLE_AI_KEY=AIzaSy…` value (line 3). Brian revoked the key at https://aistudio.google.com/apikey, minted a new one, put it in `.env.local`. The `.example` is now scrubbed back to `your_key_here`. **Tell Samson to do the same on his machine** if his `.env.local` had the same key.
- **`llm-call.ts` regression re-fixed.** The `responseMimeType: "application/json"` (in the `generateContent` `generationConfig`) and the `extractJSON()` helper were on Samson's `sam` branch but **missing from `brian`** — likely dropped during the Phase 1+2 merge. Symptom was identical to the original bug: `SyntaxError: Unexpected token 'T', "Technical "...` after an 82s prose-mode call. Both fixes re-applied. **Verify after every cross-branch merge.**
- **Grammarly hydration warning.** `<body>` had no `suppressHydrationWarning`, so the Grammarly extension's injected attributes (`data-new-gr-c-s-check-loaded`, `data-gr-ext-installed`) caused a React hydration mismatch warning on every page load. Added `suppressHydrationWarning` to `<body>` in `src/app/layout.tsx`.
- **MediaPipe install gap.** `@mediapipe/tasks-vision` was in `package.json` but not in `node_modules` on Brian's checkout. `npm install @mediapipe/tasks-vision` fixed it; build then went clean.

### Verified live (Brian's machine, end of session)

- `npm run build` → clean, all routes compile (`/`, `/setup`, `/interview/[id]`, `/api/health`, `/api/parse-jd`, `/api/next-question`)
- Dev server up on `:3000` (`http://localhost:3000/api/health` → `{"ok":true}`)
- `gemma-4-26b-a4b-it` returns HTTP 200 from the live Gemini API (verified via direct `curl`). Both Gemma 4 IDs (`-26b-a4b-it` and `-31b-it`) appear in the live `models?key=…` listing.
- The 502 Bad Gateway Brian saw mid-session was a transient Google outage, not a config issue. The fallback path engaged correctly (designed behavior).

### Pending (carry into next session)

- Test the JD parse end-to-end on `/setup` after the `llm-call.ts` fix — should return real Gemma JSON in 5–8s, no fallback warning, no 82s prose timeout.
- Phase 3 work hasn't started. See `## ▶️ What's next` below.

---

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
- `src/lib/llm-call.ts` — `callGemmaJSON` helper with Zod retry + fallback (**see critical bug fix below**)
- `src/lib/fallback-questions.json` — 10 hardcoded questions (behavioral, technical, system_design)
- `src/lib/personas.ts` — `encouraging_recruiter`, `strict_tech_lead`, `friendly_peer` constants with `systemTone` strings
- `src/lib/schemas/parsed-jd.ts` — `ParsedJdSchema` (Zod) + `PARSED_JD_RESPONSE_SCHEMA` (Gemini JSON schema object)
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

### Critical bug fixed in Phase 1 — `callGemmaJSON` dropping `responseMimeType`

**Symptom:** `[callGemmaJSON] Falling back... SyntaxError: Unexpected token 'T', "Technical "...`

**Root cause:** `generateContent` was called with `generationConfig: { temperature }`. This *overwrote* the model-level `generationConfig` that had `responseMimeType: "application/json"`, causing Gemma to return prose instead of JSON.

**Fix (already applied):**
```typescript
// In llm-call.ts generateContent call — must repeat responseMimeType here:
generationConfig: { temperature, responseMimeType: "application/json" },
```
Also added `extractJSON()` helper in `llm-call.ts` that strips markdown code blocks (` ```json...``` `) before `JSON.parse`. Gemma sometimes wraps output in those even when `responseMimeType` is set correctly.

### Model speed warning

`gemma-4-31b-it` is very slow (~20–30s for JD parsing). The code default is now `gemma-4-26b-a4b-it` (faster, ~5–8s). Samson's machine still overrides to `gemma-4-31b-it` in his local `.env.local`; he should switch to 26B if 31B is still too slow at demo time. **Never fall back to `gemma-2-*`** — that forfeits the Gemma 4 prize.

## ✅ What's done — Phase 2: Webcam + MediaPipe heuristics bundle

All Phase 2 files are complete. Webcam shows in the interview room, posture + eye-contact gauges update live, `QuestionStats` accumulates per-question stats ready for the Phase 3 score bundle.

### Files created in Phase 2

- `src/lib/mediapipe/init.ts` — `initLandmarkers()`: loads `PoseLandmarker` + `FaceLandmarker` from Google CDN with GPU delegate. Uses `...({ refineLandmarks: true } as object)` spread cast to pass the option that isn't in the 0.10.x TypeScript types (required for 478 iris landmarks; without it eye contact silently reports 0%).
- `src/lib/mediapipe/types.ts` — `PoseLandmarks`, `FaceLandmarks` type aliases
- `src/lib/scoring/posture.ts` — `postureScore(landmarks)` using NOSE (0), LEFT_SHOULDER (11), RIGHT_SHOULDER (12); three penalties: shoulder tilt (×500, max 40pts), head lean (×400), head centering (×200, max 20pts). No z-values, no hip checks — seated-aware. `RollingScore` class: 30-sample (3s at 10fps) smoothing window.
- `src/lib/scoring/eye-contact.ts` — `EyeContactTracker`: uses iris centers (468 left, 473 right) and eye corners (33/133 left, 362/263 right); calculates iris ratio within eye width; looking at camera = both ratios 0.3–0.7. Returns `false` if only 468 landmarks (iris refinement off).
- `src/lib/scoring/confidence.ts` — `compositeConfidence(posture, eyeContact)` = posture×0.4 + eyeContact×0.6
- `src/lib/scoring/question-stats.ts` — `QuestionStats` class with `sample({ posture, lookingAtCamera })`, `finalize()`, `reset()`; produces `QuestionStatsResult` = `{ posture_avg, eye_contact_pct, slouch_seconds, look_away_count, duration_seconds }`
- `src/components/interview/permissions-gate.tsx` — requests `video+audio` via `getUserMedia`, shows error on denial, "Skip CV" link appends `?cv=off`
- `src/components/interview/webcam-view.tsx` — `<video>` sets `srcObject` in `useEffect`, `playsInline muted autoPlay`; props: `stream: MediaStream`, `videoRef: RefObject<HTMLVideoElement | null>`
- `src/components/interview/confidence-gauges.tsx` — two `GaugeCard` components; color: green ≥70%, yellow ≥40%, red <40%
- `src/components/interview/tracking-loop.tsx` — `"use client"`; `FRAME_SKIP = 3` (10fps from 30fps rAF); initializes landmarkers async; logs iris landmark count on first frame (478 = ✓, 468 = broken); feeds `questionStats.sample()` and calls `onPostureChange`/`onEyeContactChange`; cleanup cancels rAF and closes landmarkers

### Modified in Phase 2

- `src/app/interview/[id]/page.tsx` — `"use client"`, `use(params)` for Next.js 16 async params, reads `?cv=off` from `window.location.search` in `useEffect`, `TrackingLoop` dynamic-imported with `ssr: false`, 2-col layout (webcam+gauges left, Phase 3 placeholder right)

### Bugs fixed in Phase 2

- **React 19 `useRef` type change:** `useRef<HTMLVideoElement>(null)` now returns `RefObject<HTMLVideoElement | null>` (not `RefObject<HTMLVideoElement>`). Component props and webcam-view/tracking-loop now use `RefObject<HTMLVideoElement | null>`.
- **`refineLandmarks` not in TypeScript types** for `@mediapipe/tasks-vision` 0.10.34: fixed with spread cast (`...({ refineLandmarks: true } as object)`).
- **`@mediapipe/tasks-vision` not installed:** `npm install @mediapipe/tasks-vision` added to `package.json`.

## ▶️ What's next — Phase 3: ElevenLabs voice + answer loop

Full plan: `docs/PLAN.md` § Phase 3. Detailed code: `docs/MVP-SPEC.md` § Phase 3.

### Pre-steps before any code

1. Sign up for ElevenLabs free tier → get `ELEVENLABS_API_KEY` (already set in `.env.local` on Samson's machine).
2. Pick **3 voice IDs** from the ElevenLabs voice library — one per persona. Add to `.env.local`:
   ```
   ELEVENLABS_VOICE_ENCOURAGING=<voice id>
   ELEVENLABS_VOICE_STRICT=<voice id>
   ELEVENLABS_VOICE_PEER=<voice id>
   ```
   These three keys are blank in the current `.env.local`. Fill them in before building `elevenlabs.ts`.
3. Use `?tts=browser` during all dev/testing to preserve ElevenLabs character quota. Only flip to real ElevenLabs at Phase 4 polish time.

### What to build (in this order)

1. **`src/lib/interview-state.ts`** — type alias for the state machine: `LOADING_INTRO | SPEAKING_QUESTION | AWAITING_ANSWER | SCORING_ANSWER | SHOW_REPORT`
2. **`src/lib/elevenlabs.ts`** — TTS client: HTTP POST to ElevenLabs, model `eleven_turbo_v2_5`, returns a `ReadableStream`
3. **`src/lib/speech-recognition.ts`** — Web Speech API wrapper; `onerror` → typed fallback (must always render textarea, never make typed mode a separate branch)
4. **`src/app/api/tts/route.ts`** — **`export const runtime = "edge";`** (mandatory — default Node runtime buffers the whole audio). Stream-forward the ElevenLabs response body.
5. **`src/app/api/score-answer/route.ts`** — receives `{ question, targets, transcript, stats, roleTitle, seniority, accessibilityMode }`; calls `callGemmaJSON` with `ScoredAnswerSchema` and a flat-50 fallback shape
6. **`src/components/interview/audio-player.tsx`** — plays TTS audio; falls through to `window.speechSynthesis` on `?tts=browser` OR fetch failure
7. **`src/components/interview/answer-input.tsx`** — mic button + textarea (textarea always renders; mic auto-fills it)
8. **`src/components/interview/question-panel.tsx`**
9. **`src/components/interview/thinking-indicator.tsx`** — three-dot pulse for the Gemma latency bridge (PRD §10.6)
10. **`src/components/interview/score-report.tsx`**
11. **Modify `src/app/interview/[id]/page.tsx`** — wire the state machine, mirror to `sessionStorage` on every state change, restore on mount. The right column currently shows a placeholder — replace it with the Phase 3 components.

### Key rules for Phase 3

- **`/api/tts` MUST use `export const runtime = "edge"`** — this is non-negotiable. Without it, Vercel buffers the entire audio stream before forwarding. See `docs/PLAN.md` § Known Gotchas #6.
- **`QuestionStats` is already accumulating.** `questionStatsRef.current` in the interview page is a live `QuestionStats` instance. Call `questionStatsRef.current.finalize()` when the user clicks "Done with answer" to get the stats bundle for the score-answer route. Call `questionStatsRef.current.reset()` before the next question.
- **`sessionStorage` shape already in use:** setup payload is at `session:${sessionId}:setup`. Store state machine state at `session:${sessionId}:state`.
- **State machine is not yet wired** — the interview page in its current form has no `LOADING_INTRO → SPEAKING_QUESTION → ...` logic. You're building that from scratch in this phase.
- **Web Speech API is Chrome-only and noise-sensitive.** Always co-render the typed textarea. Never gate transcript submission on mic working.

### Gotchas to watch for in Phase 3

- `callGemmaJSON` in `score-answer/route.ts` **must** include `responseMimeType: "application/json"` in the `generateContent` `generationConfig`. This is already handled by the helper in `src/lib/llm-call.ts` — don't bypass it.
- If `score-answer` Gemma call returns the fallback (flat 50 + generic text), that's expected behavior under load/quota. The loop must continue — never block on scoring.
- ElevenLabs `ELEVENLABS_VOICE_*` env vars map to personas via `src/lib/personas.ts`. The `PersonaId` type is `"encouraging_recruiter" | "strict_tech_lead" | "friendly_peer"`.

## Branch / env state (2026-04-25, end of Brian's session)

- **Branches in play:** `brian` (this machine), `sam` (Samson's machine), `master` (untouched). Phase 1 + Phase 2 + this session's cleanup are all on `brian`. Samson's `sam` branch has its own state — coordinate before merging.
- `npm run dev` uses `--webpack` (added to `package.json` to work around Turbopack path-with-spaces bug on Windows).
- `.env.local` on Brian's machine has fresh (post-rotation) `GOOGLE_AI_KEY`, `GEMMA_MODEL_NAME=gemma-4-26b-a4b-it`, real `ELEVENLABS_API_KEY` (carried over from Samson's). Three `ELEVENLABS_VOICE_*` keys still blank.
- `npm run build` passes clean (TypeScript clean, all routes compile).
- **Merge hygiene:** verify `src/lib/llm-call.ts` keeps both fixes (lines 36 + 40-41) after every merge from `sam`. The pattern of dropping these during merge has happened twice now.

## ⚠️ Outstanding from all phases

- **Vercel deploy** — interactive, requires team auth. Run `npx vercel link` then `npx vercel --prod`. Set `GOOGLE_AI_KEY`, `GEMMA_MODEL_NAME`, `ELEVENLABS_API_KEY`, the three voice IDs, and `NEXT_PUBLIC_DEMO_USER_ID` in the dashboard.
- **ElevenLabs voice IDs** — three blank entries in `.env.local`. Fill in before Phase 3 integration testing.
- **Model speed** — code default is now `gemma-4-26b-a4b-it` (faster). Samson's local `.env.local` overrides to `gemma-4-31b-it`; he should switch to 26B if 31B is still too slow at demo time.

## Don't forget (rules from PRD/spec)

- **Do not push to `master`** without team confirmation.
- **Do not introduce** Ollama, LangChain, Zustand, or Auth0 — excluded by team agreement.
- **MediaPipe at 10fps** (`FRAME_SKIP = 3`), never 30fps.
- **`/api/tts` uses `export const runtime = "edge"`** — streaming breaks without it.
- **Devpost copy must say "Gemma 4 via the Google Gemini API"** verbatim — Tier 1 prize criterion.
- **Backboard is hour-18 gated.** Skip entirely if Phases 0-4 aren't all green by then.
