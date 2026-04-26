# CareerPrep AI — Implementation Plan (NodeBud scaffold, BroncoHacks 2026)

## Context

This plan adapts the PRD + MVP build spec (see `docs/PRD.md`, `docs/MVP-SPEC.md`) to the actual scaffold in this repo. The spec was written assuming Next.js 14 + `app/` + pnpm + no scaffold yet; the repo is **Next.js 16.2.4 + React 19.2.4 + `src/app/` + npm + Tailwind v4** with most boilerplate already in place. The repo's `AGENTS.md` explicitly warns that this Next.js version has breaking changes from training-data-era Next.js — async `params`, async `cookies()`/`headers()`, `middleware.ts` → `proxy.ts`, Turbopack default, `useFormState` → `useActionState`. Every dynamic-route page in this plan accounts for those.

Two scope decisions, locked:
1. **Backboard** ships in Phase 4.5 with the spec's hour-18 green-light gate. localStorage is the primary store; Backboard is purely additive.
2. **UI** uses **shadcn/ui** primitives (initialized in Phase 0). v0.dev components can still be pasted on top later.

The number-one rule from the PRD remains: **a working subset that demos cleanly beats a sprawling project that crashes during judging.** Defend the core loop.

---

## Stack Deltas vs. Spec (read this before any phase)

| Spec assumed | Actual scaffold | Plan adjusts |
|---|---|---|
| Next.js 14 with sync `params` | **Next.js 16.2.4** with `params: Promise<…>` | Every `[id]` route awaits params (server components) or uses React's `use()` hook (client components) |
| App dir at `app/` | **`src/app/`** with `@/*` → `./src/*` alias | All paths use `src/...` and imports use `@/...` |
| pnpm | **npm** (lockfile is `package-lock.json`) | All commands use `npm` |
| Tailwind v3 + `tailwind.config.ts` | **Tailwind v4** via `@tailwindcss/postcss`, no JS config | Theme tokens live in `src/app/globals.css` (already configured) |
| `useFormState` (React 18) | **React 19.2.4** | Use `useActionState` if needed (likely not needed — this app is mostly client-state) |
| `middleware.ts` | **Renamed to `proxy.ts`** in Next.js 16 | Plan does not need middleware/proxy, so non-issue |
| ESLint v8 / `.eslintrc` | **ESLint v9 flat config** in `eslint.config.mjs` | Existing config already extends `eslint-config-next` — no changes needed |
| `--src-dir=false` create flag | **`src/app/` already exists** | Skip create; build inside existing repo |
| Webpack | **Turbopack default** | No config changes needed |
| shadcn on Radix UI | **shadcn 4.x on Base UI** (`style: "base-nova"`) | `Button` has no `asChild`; use `buttonVariants` on the wrapped element directly |

**Already done by the existing scaffold (do NOT redo):**
- Next.js 16 + React 19 + TypeScript strict + Tailwind v4 installed
- `@google/generative-ai ^0.24.1` and `zod ^4.3.6` installed
- `.env.local.example` exists with full key list
- `.gitignore` correctly excludes `.env*.local`
- ESLint flat config + Geist fonts configured

**Branch:** Stay on `brian` for the build. Do not push to `master` without dev confirmation.

---

## Target File Tree (after all phases)

```
NodeBud/
├── .env.local                      ← (created locally, gitignored)
├── .env.local.example              ← (already exists; expand with VOICE IDs in Phase 3)
├── components.json                 ← (shadcn config, Phase 0 ✅)
├── next.config.ts                  ← (already exists; unchanged)
├── eslint.config.mjs               ← (already exists; unchanged)
├── tsconfig.json                   ← (already exists; unchanged)
├── package.json
├── postcss.config.mjs              ← (already exists; unchanged)
├── public/
│   └── (existing logos — leave or replace optionally in Phase 4)
└── src/
    ├── app/
    │   ├── layout.tsx              ← (Phase 0 ✅ — branded metadata + Toaster)
    │   ├── globals.css             ← (Phase 0 ✅ — shadcn theme tokens)
    │   ├── page.tsx                ← (Phase 0 ✅ — CareerPrep landing)
    │   ├── setup/
    │   │   └── page.tsx            ← (Phase 1)
    │   ├── interview/
    │   │   └── [id]/
    │   │       └── page.tsx        ← (Phase 2-3) — Next.js 16 async params
    │   ├── dashboard/
    │   │   └── page.tsx            ← (Phase 4)
    │   └── api/
    │       ├── health/route.ts     ← (Phase 0 ✅ sanity check)
    │       ├── parse-jd/route.ts   ← (Phase 1)
    │       ├── next-question/route.ts ← (Phase 1)
    │       ├── score-answer/route.ts  ← (Phase 3)
    │       └── tts/route.ts        ← (Phase 3, edge runtime)
    ├── components/
    │   ├── ui/                     ← (shadcn primitives, Phase 0 ✅)
    │   ├── setup/
    │   │   ├── jd-textarea.tsx
    │   │   ├── persona-picker.tsx
    │   │   └── parsed-competencies.tsx
    │   ├── interview/
    │   │   ├── permissions-gate.tsx
    │   │   ├── webcam-view.tsx
    │   │   ├── confidence-gauges.tsx
    │   │   ├── tracking-loop.tsx       ← dynamic-imported, ssr:false
    │   │   ├── audio-player.tsx
    │   │   ├── answer-input.tsx
    │   │   ├── question-panel.tsx
    │   │   ├── thinking-indicator.tsx
    │   │   └── score-report.tsx
    │   └── dashboard/
    │       ├── trend-chart.tsx
    │       └── session-card.tsx
    └── lib/
        ├── utils.ts                ← (Phase 0 ✅ — shadcn cn() helper)
        ├── llm.ts                  ← Google AI client (Phase 1)
        ├── llm-call.ts             ← callGemmaJSON helper (Phase 1)
        ├── fallback-questions.json ← (Phase 1)
        ├── elevenlabs.ts           ← (Phase 3)
        ├── speech-recognition.ts   ← (Phase 3)
        ├── session-store.ts        ← localStorage helpers (Phase 4)
        ├── backboard.ts            ← (Phase 4.5, optional)
        ├── personas.ts             ← persona constants
        ├── interview-state.ts      ← state machine types
        ├── schemas/
        │   ├── parsed-jd.ts
        │   ├── interview-question.ts
        │   └── scored-answer.ts
        ├── prompts/
        │   ├── parse-jd.ts
        │   ├── next-question.ts
        │   └── score-answer.ts
        ├── mediapipe/
        │   ├── init.ts
        │   └── types.ts
        └── scoring/
            ├── posture.ts
            ├── eye-contact.ts
            ├── confidence.ts
            └── question-stats.ts
```

---

## Phase 0 — Scaffold hardening ✅ COMPLETE

**Goal:** App boots, lands on a CareerPrep-branded page, has a `/api/health` endpoint, and shadcn primitives are wired up.

**What landed:**
- Default Next.js scaffold replaced with CareerPrep landing (heading, privacy line, "Start a mock interview" CTA → `/setup`).
- shadcn/ui initialized with `style: "base-nova"` (Base UI under the hood, NOT Radix), `baseColor: "neutral"`. Primitives installed: `button`, `card`, `textarea`, `select`, `label`, `slider`, `sonner`, `badge`, `separator`.
- `src/app/layout.tsx`: CareerPrep metadata, `<Toaster />` mounted, Geist sans aligned to `--font-sans` so shadcn theme tokens resolve.
- `src/app/api/health/route.ts`: returns `{ ok: true }`.
- `.env.local.example`: expanded with `GEMMA_MODEL_NAME`, three `ELEVENLABS_VOICE_*` keys, `BACKBOARD_API_KEY`, `NEXT_PUBLIC_DEMO_USER_ID`.
- Local `.env.local` exists with placeholder values (gitignored).

**Verified locally:**
- `npm run build` passes — TypeScript clean, 5 static pages + 1 dynamic route.
- `GET /api/health` → `200 {"ok":true}`.
- `GET /` → `200`, contains "CareerPrep AI", "Start a mock interview", `/setup`.
- Dev server starts in ~1s.

**Outstanding:**
- ⚠️ Vercel deploy is interactive — requires team auth. Run `npx vercel link` then `npx vercel --prod` from this repo. Set env vars in dashboard.

**Notable adaptation:** shadcn 4.x on Base UI doesn't have `asChild`. To style a `<Link>` as a button, use `buttonVariants` directly: `<Link className={buttonVariants({ size: "lg" })}>`. The `page.tsx` landing uses this pattern.

---

## Phase 1 — Gemma JD parsing + question generation (3 hr, hard stop 4.5)

**Goal:** User pastes a JD on `/setup`, picks a persona, clicks "Generate Questions" — sees parsed competencies on screen and gets routed to the interview shell with 3-5 tailored questions. No webcam, no voice yet — just text end-to-end with full Zod retry + fallback paths.

**Why first:** Gemma is the Tier-1 anchor prize. If Gemma integration doesn't work, nothing else matters.

**Pre-step (user must do):**
1. Log into `aistudio.google.com`, generate API key → set `GOOGLE_AI_KEY` in `.env.local` and Vercel.
2. Pick a Gemma 4 variant that supports `generateContent` — default `gemma-4-26b-a4b-it` (faster than 31B) → set `GEMMA_MODEL_NAME`. Do NOT use `gemma-2-*` (forfeits the Gemma 4 prize).

**Files:**
- Create: `src/lib/llm.ts`
- Create: `src/lib/llm-call.ts`
- Create: `src/lib/fallback-questions.json`
- Create: `src/lib/personas.ts`
- Create: `src/lib/schemas/parsed-jd.ts`, `interview-question.ts`, `scored-answer.ts` (define all three now to lock the type contract)
- Create: `src/lib/prompts/parse-jd.ts`, `next-question.ts`, `score-answer.ts`
- Create: `src/app/api/parse-jd/route.ts`
- Create: `src/app/api/next-question/route.ts`
- Create: `src/app/setup/page.tsx`
- Create: `src/components/setup/jd-textarea.tsx`, `persona-picker.tsx`, `parsed-competencies.tsx`

**Implementation notes (deltas from spec):**
- Spec uses `process.env.GEMMA_MODEL_NAME ?? "gemma-4-26b-a4b-it"`. Default is already in `.env.local.example`.
- `callGemmaJSON` helper from `docs/MVP-SPEC.md` §Phase 1 is verbatim correct — implement as-is. The `responseSchema` + retry-on-Zod-fail + fallback-on-second-fail pattern is the safety net.
- Build `fallback-questions.json` (10 entries from spec) **before** the API route. This is the safety net for every later phase.
- Setup page uses `useState` + `useRouter` (exactly per spec). Mirror to `sessionStorage` via `useEffect` so the interview page can rehydrate on refresh.

**State pattern (locked):** React `useState` + `sessionStorage` mirror. **No Zustand.**

**Stop-and-test checkpoint:**
- [ ] Pasting a real Google L4 SWE JD returns parsed competencies in <8s
- [ ] Pasting gibberish → low-confidence parse OR fallback profile (no crash)
- [ ] Temporarily wiping `GOOGLE_AI_KEY` → fallback object returned, no 500
- [ ] Three different JDs produce visibly different competency lists
- [ ] Console has zero unhandled errors on happy path
- [ ] Clicking "Start Interview" routes to `/interview/[id]` and `sessionStorage` has the setup payload

**Fallbacks enabled by this phase:**
- Gemma 5xx → fallback object
- JSON drift → Zod retry → fallback after retry
- Demo continues even if Google AI is fully down

---

## Phase 2 — Webcam + MediaPipe heuristics bundle (4 hr, hard stop 6)

**Goal:** On `/interview/[id]`, user grants camera access, sees their video, sees Posture + Eye-Contact gauges updating live. **`QuestionStats` accumulator finalizes into the bundle that gets sent to Gemma in Phase 3.**

**Why second:** CV is the differentiator. Most interview tools are voice-only.

**Files:**
- Create: `src/app/interview/[id]/page.tsx` — **Next.js 16 async params** — this is a client component (`"use client"`) that uses React's `use()` hook to unwrap `params: Promise<{ id: string }>`:
  ```typescript
  "use client";
  import { use } from "react";
  export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: sessionId } = use(params);
    // …
  }
  ```
  This is the single most important Next.js 16 idiom in the build. **Do not write `params.id` directly.**
- Install: `npm install @mediapipe/tasks-vision`
- Create: `src/lib/mediapipe/init.ts` — `initLandmarkers()` factory using `FilesetResolver.forVisionTasks(...)` + `PoseLandmarker.createFromOptions({ baseOptions: { delegate: "GPU" } })` and `FaceLandmarker.createFromOptions({ outputFaceBlendshapes: false, refineLandmarks: true })`. **Iris refinement (`refineLandmarks: true`) is required** or eye contact silently reports 0%.
- Create: `src/lib/mediapipe/types.ts`
- Create: `src/lib/scoring/posture.ts` — `postureScore(landmarks)` + `RollingScore` (3-sec smoothing). **Use seated-aware math** (no z-values, no hip-based torso checks).
- Create: `src/lib/scoring/eye-contact.ts` — `EyeContactTracker` using iris position vs. eye corners.
- Create: `src/lib/scoring/confidence.ts` — composite (used for the gauge display).
- Create: `src/lib/scoring/question-stats.ts` — `QuestionStats` class verbatim from `docs/MVP-SPEC.md` §Phase 2.
- Create: `src/components/interview/permissions-gate.tsx` — `getUserMedia` + "Skip CV" link (verbatim from spec).
- Create: `src/components/interview/webcam-view.tsx` — `<video>` with `srcObject = stream`, `playsInline`, `muted`, `autoPlay`.
- Create: `src/components/interview/confidence-gauges.tsx` — two numeric gauges (use shadcn `<Card>` + animated numbers).
- Create: `src/components/interview/tracking-loop.tsx` — **dynamic-imported with `ssr: false`**:
  ```typescript
  const TrackingLoop = dynamic(() => import("@/components/interview/tracking-loop"), { ssr: false });
  ```
  rAF loop with **`FRAME_SKIP = 3`** (10fps inference, ~30fps RAF). Sample `pose.detectForVideo` and `face.detectForVideo` with `performance.now()` timestamp. Pipe results into `QuestionStats.sample(...)`.

**Critical implementation rules (from PRD §10.1):**
- **GPU delegate from frame one.**
- **10fps throttle, not 30fps.** Spec is explicit: `FRAME_SKIP = 3`.
- **Sanity check:** log `face.faceLandmarks[0].length` once on first frame. 478 = iris refinement on. 468 = off and eye contact will be silently broken.
- **`?cv=off` query param** disables MediaPipe entirely. Read query param in client component, branch accordingly.

**Stop-and-test checkpoint:**
- [ ] Camera permission prompts once
- [ ] Video preview shows the user
- [ ] Posture gauge drops by 20+ when user slouches forward
- [ ] Eye-contact gauge drops when user looks away
- [ ] DevTools Performance panel shows >25fps page render (the "is 10fps throttling working" check)
- [ ] `?cv=off` shows "CV disabled" state and no MediaPipe in network tab
- [ ] 5-min idle session — no memory leak (heap stable in DevTools)
- [ ] `QuestionStats.finalize()` returns sensible numbers after 30s session

**Fallbacks enabled:**
- Permission denied → "Skip CV" link → `?cv=off`
- Low FPS detected → snapshot mode (build only if observed in testing)
- Mid-demo CV crash → typed-answer mode (kicks in via Phase 3)

---

## Phase 3 — ElevenLabs voice + answer loop (4 hr, hard stop 6)

**Goal:** Full interview cycle works. Question is spoken → user answers (mic OR typed) → CV stats + transcript bundled → Gemma scores → next question generated → repeat 3-5 times → score report.

**Phase 3 dev rule (from PRD):** ElevenLabs is character-quota-limited. Test the integration **once at the start of Phase 3**, then develop with `window.speechSynthesis` (`?tts=browser`). Switch to ElevenLabs only at Phase 4 polish time.

**Pre-step (user must do):**
1. Sign up for ElevenLabs free tier → get `ELEVENLABS_API_KEY`.
2. Pick **3 voice IDs** from ElevenLabs voice library (one each for the three personas). Add to `.env.local`:
   ```
   ELEVENLABS_VOICE_ENCOURAGING=…
   ELEVENLABS_VOICE_STRICT=…
   ELEVENLABS_VOICE_PEER=…
   ```

**Files:**
- Create: `src/lib/elevenlabs.ts` — TTS client (HTTP streaming, `eleven_turbo_v2_5` model)
- Create: `src/lib/speech-recognition.ts` — Web Speech API wrapper with `onerror` → typed fallback
- Create: `src/lib/interview-state.ts` — state machine types: `LOADING_INTRO | SPEAKING_QUESTION | AWAITING_ANSWER | SCORING_ANSWER | SHOW_REPORT`
- Create: `src/app/api/tts/route.ts` — **`export const runtime = "edge";`** + stream forwarding (verbatim from `docs/MVP-SPEC.md` §Phase 3, do NOT `await arrayBuffer`)
- Create: `src/app/api/score-answer/route.ts` — receives `{ question, targets, transcript, stats, roleTitle, seniority, accessibilityMode }` bundle; calls `callGemmaJSON` with `ScoredAnswerSchema` + a hardcoded fallback shape
- Create: `src/components/interview/audio-player.tsx` — defaults to ElevenLabs, falls through to `speechSynthesis` on `?tts=browser` OR fetch failure
- Create: `src/components/interview/answer-input.tsx` — mic button + textarea (textarea always renders; mic auto-fills it)
- Create: `src/components/interview/question-panel.tsx`
- Create: `src/components/interview/thinking-indicator.tsx` — three-dot pulse for the latency bridge (PRD §10.6)
- Create: `src/components/interview/score-report.tsx`
- Modify: `src/app/interview/[id]/page.tsx` — wire the state machine; mirror state to `sessionStorage` on every change; restore on mount

**Implementation notes:**
- **Edge runtime for TTS is mandatory** (Vercel free tier serverless functions have payload limits for streaming — Edge handles ReadableStream natively).
- The score-answer route is where the heuristics-bundle architecture pays off. Server gets only JSON: `{ stats: { posture_avg: 73, eye_contact_pct: 64, slouch_seconds: 8, look_away_count: 3 }, transcript, question }`. **No video over the network. Ever.**
- The Gemma fallback for `ScoredAnswerSchema` is a flat 50/100 with one generic strength + improvement so the loop never blocks.
- Mandatory thinking-indicator the moment user clicks Start (PRD §10.6).

**Stop-and-test checkpoint:**
- [ ] Click Start → first question audio plays within 3s (with thinking-indicator visible during the bridge)
- [ ] User speaks → transcript appears in real time
- [ ] Click "Done with answer" → score computed → next question audio plays
- [ ] After 3 questions → score report renders with strengths and improvements
- [ ] Score report references CV stats explicitly (e.g., "You looked away 5 times")
- [ ] `?tts=browser` swaps to robotic browser voice and still completes
- [ ] `?cv=off` lets a user complete the loop without webcam
- [ ] Mic permission denied → typed textarea takes focus automatically
- [ ] Refreshing the interview page restores state from sessionStorage

**Fallbacks enabled:**
- ElevenLabs slow/down → `?tts=browser`
- Mic broken → typed answers (textarea always visible)
- Web Speech transcription bad → user edits textarea before submitting

---

## Phase 4 — Polish + dashboard + ElevenLabs on (4 hr, hard stop 5)

**Goal:** App looks like a product, not a hackathon project. Dashboard reads from localStorage with a trend chart. ElevenLabs is enabled for the demo.

**Files:**
- Create: `src/lib/session-store.ts` — `listSessions()`, `saveSession()`, capped at 50 (verbatim from `docs/MVP-SPEC.md` §Phase 4)
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/trend-chart.tsx` — simple line chart. Use **Recharts** (`npm install recharts`) — a known-stable React 19-compatible chart lib.
- Create: `src/components/dashboard/session-card.tsx` — shadcn `<Card>` with date / role / score / "View Details"
- Modify: `src/components/interview/score-report.tsx` — add "Save Session" button that writes to `session-store.ts`
- Modify: `src/app/page.tsx` — add `<Link>` to `/dashboard`
- Modify: `src/app/layout.tsx` — header bar with brand + dashboard link
- (Optional) Replace `public/*.svg` with a simple CareerPrep wordmark

**Demo seed data (run in browser console on demo laptop Saturday night):**
```javascript
// Verbatim from spec §Phase 4 — non-monotonic scores feel authentic
const SEED = [
  { id: "s1", date: "2026-04-08T14:00:00Z", role_title: "Frontend Engineer Intern", persona: "encouraging_recruiter", overall_score: 72, questions: [], weak_competencies: ["system_design"] },
  { id: "s2", date: "2026-04-15T16:30:00Z", role_title: "Frontend Engineer Intern", persona: "strict_tech_lead",       overall_score: 68, questions: [], weak_competencies: ["caching", "system_design"] },
  { id: "s3", date: "2026-04-20T19:00:00Z", role_title: "Frontend Engineer Intern", persona: "strict_tech_lead",       overall_score: 81, questions: [], weak_competencies: ["caching"] },
  { id: "s4", date: "2026-04-23T15:00:00Z", role_title: "Frontend Engineer Intern", persona: "encouraging_recruiter", overall_score: 76, questions: [], weak_competencies: [] },
];
localStorage.setItem("careerprep:sessions", JSON.stringify(SEED));
```

**ElevenLabs flip-on:** Remove any dev-only `?tts=browser` defaults. Verify quota in ElevenLabs dashboard. Cap demo to 3 voiced questions if quota is tight.

**Stop-and-test checkpoint:**
- [ ] `/dashboard` shows seeded sessions with non-monotonic trend chart
- [ ] Completing a real interview adds an entry to the dashboard
- [ ] All pages have consistent header/footer
- [ ] ElevenLabs voice plays for the demo (not browser TTS)
- [ ] Production deploy is live; demo URL works in incognito Chrome

**Fallbacks enabled:**
- localStorage corrupted → empty array (graceful)
- ElevenLabs fails → browser TTS (Phase 3 fallback still wired)

---

## Phase 4.5 — Backboard add-on (3 hr max, OPTIONAL — gated)

**DECISION GATE — read before starting.** Only proceed if at hour 18 ALL of the following are true:
- [ ] Production deploy is live and stable
- [ ] Full interview loop works end-to-end
- [ ] Dashboard with seeded data renders cleanly
- [ ] Demo video script is drafted
- [ ] No blocking bugs

If ANY are false: **skip entirely**. Tier 2 is not worth sinking the demo.

**Goal:** Add Backboard as a memory-recall layer on top of localStorage. Demo opener becomes "Welcome back — last time, [weak_competency] was tough for you."

**Pre-step:** Get Backboard API key (promo code `BRONCOHACKSMLH`). Set `BACKBOARD_API_KEY` in `.env.local` and Vercel. **Verify the actual API base URL and request shape from Backboard's docs** — the spec's `https://api.backboard.io/v1` is a placeholder.

**Files:**
- Create: `src/lib/backboard.ts` — `writeMemory()` and `recallMemories()` with `try/catch` returning `null`/`[]` on failure (verbatim from `docs/MVP-SPEC.md` §Phase 4.5)
- Modify: `src/app/api/score-answer/route.ts` — after scoring, fire-and-forget `writeMemory(userId, { type: "weak_area", competency, evidence, confidence })`
- Modify: `src/app/api/next-question/route.ts` (or wherever the first question is generated) — call `recallMemories(userId, "weak areas")`. If memories exist, prepend a callback line to the first question's intro: `"Welcome back — last time, ${competency} was tough for you. Let's revisit that."`
- Add: hybrid recall pattern — if Backboard returns nothing OR errors, fall through to `listSessions().slice(0,3).flatMap(s => s.weak_competencies)` from `session-store.ts`

**Stop-and-test checkpoint:**
- [ ] Backboard write succeeds for a test session (visible in their dashboard)
- [ ] Backboard recall returns memories from earlier writes
- [ ] Killing `BACKBOARD_API_KEY` → silent fall-through to localStorage (no error in UI)
- [ ] Demo opener says "Welcome back, [name] — last time, [weak_area] was tough for you."

**Graceful degradation:** Backboard down → silent localStorage fallback → Tier 2 lost cleanly, Tier 1 demo unaffected.

---

## Phase 5 — Devpost submission + demo video (3 hr, hard stop Sun 12:00 PM)

User-driven, not Claude-executable. See `docs/MVP-SPEC.md` §Phase 5 for the checklist.

**Critical Devpost copy:** the writeup MUST say **"Gemma 4 via the Google Gemini API"** explicitly (Tier 1 prize criterion).

**Pre-recorded backup video:** Record a SECOND copy Sunday morning while everything's working. Absolute fallback if anything breaks 5 minutes before judging.

---

## Verification Plan

### Per-phase verification (handled by stop-and-test checkpoints above)

### End-to-end smoke test (run before Phase 5)

1. **Cold-load demo URL in incognito Chrome** on the demo laptop.
2. Click "Start a mock interview" → `/setup` loads.
3. Paste a real JD (use a Google L4 SWE listing). Pick "Strict Tech Lead." Click Generate.
4. Wait <8s — competencies appear, "Start Interview" enables.
5. Click Start → permission prompt → grant camera+mic.
6. **First question audio plays within 3s** — thinking-indicator visible during bridge.
7. **Slouch deliberately** — posture gauge drops 20+ points.
8. **Look at the laptop's lid hinge for 3 seconds** — eye-contact gauge drops, look-away counter increments.
9. Speak an answer (or type if mic is unreliable). Click "Done with answer."
10. Next question audio plays within 5s.
11. Complete 3 questions total.
12. Score report renders with overall score, per-question 5-dim scores, 1-3 strengths, 1-3 improvements that **reference both transcript AND CV stats**.
13. Click "Save Session" → routes to `/dashboard`.
14. Dashboard shows the new session at the top with non-monotonic trend.
15. **Refresh `/dashboard`** — sessions persist (localStorage).

### Fallback drill (run twice before judging)

Run the entire flow above with each toggle:
- **`?cv=off`** — interview completes via typed answers; no posture/eye-contact UI
- **`?tts=browser`** — interview completes with `speechSynthesis`; ElevenLabs untouched
- **Disable mic in browser settings** — typed textarea takes focus automatically; flow completes

### Definition of done (PRD §14)

- [ ] App deployed to public Vercel URL
- [ ] Judge can paste JD, pick persona, complete one full interview question
- [ ] AI's voice is ElevenLabs (not browser TTS) for demo
- [ ] Posture gauge moves visibly when user slouches
- [ ] Score report has 3+ specific strengths/improvements
- [ ] Dashboard shows past sessions from localStorage
- [ ] Devpost has video, screenshots, sponsor paragraphs, GitHub link
- [ ] Devpost says **"Gemma 4 via the Google Gemini API"** explicitly
- [ ] Demo rehearsed end-to-end at least twice
- [ ] All backup toggles (`?cv=off`, `?tts=browser`, typed mode) verified

If any item is missing at Sun 12:00 PM, **drop scope, not quality**.

---

## Known Gotchas (read before any phase)

1. **Next.js 16 async params.** `app/interview/[id]/page.tsx` MUST use `use(params)` (client component) or `await params` (server component). Spec was written for Next.js 14 sync params. **This will be the #1 source of "works locally, breaks on Vercel" surprises if forgotten.**
2. **shadcn on Base UI, not Radix.** `Button` has no `asChild` prop. Style links as buttons via `<Link className={buttonVariants({ size: "lg" })}>`. Base UI exposes a `render` prop instead of `asChild`.
3. **Tailwind v4, no JS config.** Don't create `tailwind.config.ts`. Theme tokens go in `src/app/globals.css` via `@theme inline`. shadcn init has already wired this up.
4. **MediaPipe `refineLandmarks: true`.** Without iris refinement, eye contact is silently 0%. Log `face.faceLandmarks[0].length` once on first frame — must be 478, not 468.
5. **MediaPipe must be dynamic-imported with `ssr: false`.** Importing at module top level will crash the server build.
6. **TTS route uses Edge runtime.** Streaming `Response(upstream.body)` over the default Node runtime on Vercel will buffer the entire audio. Edge passes the stream through.
7. **ElevenLabs char quota is shared across the team.** Burning it during dev means demo silence. Use `?tts=browser` until Phase 4.
8. **Web Speech API is Chrome-only and noise-sensitive.** Always render the textarea fallback alongside the mic button — never make typed mode a separate branch.
9. **Vercel env vars must be set before deploy.** `GOOGLE_AI_KEY`, `GEMMA_MODEL_NAME`, `ELEVENLABS_API_KEY`, the three voice IDs, optionally `BACKBOARD_API_KEY`, plus `NEXT_PUBLIC_DEMO_USER_ID`.
10. **Hotspot in the bag.** Cal Poly Pomona WiFi will be hammered. Production demo on hotspot, fallbacks pre-rehearsed (PRD §10.5).
11. **Pre-recorded demo video** is the absolute last-resort fallback (PRD §11 universal).

---

## What This Plan Does NOT Add

Per `docs/MVP-SPEC.md` §"What Claude Code should NOT do" — these are explicit exclusions:
- No Ollama (forfeits Gemma 4 prize)
- No LangChain (Zod + 30-line `callGemmaJSON` covers it)
- No Zustand (`useState` + `sessionStorage` is sufficient)
- No Auth0 (deferred per team agreement)
- No tests (no time in 25-hour build)
- No 30fps MediaPipe — always throttle to 10fps
- No refactoring of working code
- No pushing to `master` without dev confirmation

---

## Build Order at a Glance

| Phase | Hours | Cumulative | Key milestone |
|---|---|---|---|
| 0. Scaffold hardening ✅ | 0.75 | 0.75 | App boots, shadcn ready |
| 1. Gemma loop | 3 | 3.75 | JD → questions on screen |
| 2. CV gauges + heuristics bundle | 4 | 7.75 | Posture + eye contact live |
| 3. Voice + answer loop | 4 | 11.75 | Full interview cycle |
| 4. Polish + dashboard + ElevenLabs on | 4 | 15.75 | Looks like a product |
| 4.5. Backboard add-on (gated, optional) | 3 | 18.75 | Tier 2 prize claimed |
| 5. Submit + demo video | 3 | 21.75 (or 18.75 w/o 4.5) | Devpost done |

**Slack budget: 3-6 hours** for sleep, debugging, demo prep, and the inevitable surprise.

If we're at hour 12 with Phases 0-2 done but Phase 3 broken: drop voice (use browser TTS), skip Phase 4.5, ship the core loop. Tier 1 prizes still in play.
