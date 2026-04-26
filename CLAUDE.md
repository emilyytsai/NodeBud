# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

This repo (NodeBud) is the build for **CareerPrep AI**, a BroncoHacks 2026 hackathon submission (Cal Poly Pomona, Education track). Build window: Sat 2026-04-25 → Sun 2026-04-26.

Project context lives in `docs/`:
- `docs/STATUS.md` — **start here.** What's done, what's next, who needs to do what.
- `docs/PRD.md` — Product Requirements (v1.1).
- `docs/MVP-SPEC.md` — phase-by-phase build spec with verbatim code snippets (v1.1).
- `docs/PLAN.md` — implementation plan adapted to this repo's actual stack (Next.js 16, src/app/, Tailwind v4, npm).

## Commands

- `npm run dev` — Next.js dev server. Uses `--webpack` flag (Turbopack has a bug with Windows paths containing spaces — `package.json` already has this set). Reads `.env.local`.
- `npm run build` — Production build. Validates TypeScript and routing. Use this as the smoke test before committing.
- `npm run start` — Serve the production build.
- `npm run lint` — ESLint v9 flat config (`eslint.config.mjs`), extends `eslint-config-next`.
- `npx shadcn@latest add <component>` — Pull a shadcn primitive into `src/components/ui/`.

There are no tests in this repo by design — the hackathon spec excludes them.

## Architecture

**Heuristics-bundle pattern (the central architectural decision).** Webcam frames never leave the browser. MediaPipe runs at 10fps (`FRAME_SKIP = 3`) on the GPU delegate, producing landmarks. Heuristic functions in `src/lib/scoring/` reduce frames to a per-question stats object — `{ posture_avg, eye_contact_pct, slouch_seconds, look_away_count, duration_seconds }`. That JSON object is bundled with the answer transcript and the question, then sent to the Gemini API for scoring. The server side is bounded: just JSON in/out. This is what makes Vercel deployment viable.

**Interview state machine.** `LOADING_INTRO → SPEAKING_QUESTION → AWAITING_ANSWER → SCORING_ANSWER → (loop or SHOW_REPORT)`. Implemented as React `useState` in `src/app/interview/[id]/page.tsx`, mirrored to `sessionStorage` via `useEffect` so a refresh restores state. **No Zustand** — by design.

**LLM contract.** All Gemma calls go through `callGemmaJSON(systemPrompt, userPrompt, zodSchema, { fallback })` in `src/lib/llm-call.ts`. The helper retries once on Zod validation failure with stricter prompting; if retry fails, it returns the supplied fallback so the user-facing loop never blocks. Schemas live in `src/lib/schemas/`. **No LangChain** — by design.

**Persistence.** Primary store is `localStorage` via `src/lib/session-store.ts` (cap 50 sessions). Backboard is an optional Phase 4.5 add-on layered through `src/lib/backboard.ts` with graceful no-op degradation when `BACKBOARD_API_KEY` is unset.

**Fallback toggles** (must always work — they are the demo-day safety net):
- `?cv=off` — disables MediaPipe entirely; interview proceeds via typed answers
- `?tts=browser` — swaps ElevenLabs for `window.speechSynthesis`
- Mic permission denied — typed-answer textarea takes focus automatically (the textarea always renders alongside the mic button; mic just auto-fills it)

## Stack-specific gotchas

These break in non-obvious ways:

- **Next.js 16 async params.** In dynamic routes, `params` and `searchParams` are `Promise<…>`. Server components: `const { id } = await params;`. Client components (`"use client"`): `const { id } = use(params);` from React. Spec text was written for Next.js 14 sync params — don't copy that pattern.
- **shadcn uses Base UI, not Radix.** `Button` has no `asChild` prop. To style a `<Link>` as a button, use `buttonVariants` directly: `<Link className={buttonVariants({ size: "lg" })}>`. Base UI exposes a `render` prop instead of `asChild`.
- **Tailwind v4 has no `tailwind.config.ts`.** Theme tokens are in `src/app/globals.css` via `@theme inline`. shadcn init writes there directly.
- **MediaPipe must be `dynamic()`-imported with `ssr: false`.** Top-level imports crash the server build.
- **TTS route uses `export const runtime = "edge"`** so streaming `Response(upstream.body)` from ElevenLabs flows through. The default Node runtime buffers the entire audio.
- **Iris refinement.** `FaceLandmarker.createFromOptions({ refineLandmarks: true })` is required or `face.faceLandmarks[0].length === 468` (instead of 478) and eye contact silently reports 0%. The option isn't in the 0.10.x TypeScript types — pass it with a spread cast: `...({ refineLandmarks: true } as object)`.
- **`gemma-3-4b-it` does not support JSON mode.** Do NOT add `responseMimeType: "application/json"` or `responseSchema` to `getGenerativeModel` or `generateContent` — it causes a 400 Bad Request. Both have been removed from `llm.ts` and `llm-call.ts`. Rely on prompting + `extractJSON()` instead.
- **`extractJSON` strips markdown fences.** Gemma wraps output in ` ```json...``` ` even without JSON mode. The `extractJSON()` helper in `llm-call.ts` strips fences and extracts the balanced JSON object before `JSON.parse`. Do not bypass it.
- **React 19 `useRef` type change.** `useRef<HTMLVideoElement>(null)` now returns `RefObject<HTMLVideoElement | null>`, not `RefObject<HTMLVideoElement>`. Component props that accept a video ref must be typed `RefObject<HTMLVideoElement | null>`.
- **Turbopack + Windows paths with spaces.** Turbopack (Next.js default bundler) crashes when the project path contains spaces (e.g., `C:\Users\Samson Du\`). The `package.json` dev script already has `--webpack` to work around this. Do not remove it.
- **Active model is `gemma-3-4b-it`.** Set in `GEMMA_MODEL_NAME` in `.env.local` and as the fallback in `src/lib/llm.ts`. This is the only model used — there is no separate flash model. Do not switch to a Gemma 4 variant without verifying JSON mode support first.

## Conventions

- Path alias: `@/*` → `./src/*`. Imports look like `@/lib/llm`, `@/components/ui/button`.
- Package manager: **npm** (lockfile is `package-lock.json`).
- Branch policy: each dev works on their own branch (`brian`, `sam`, etc.), main is `master`. Don't push to `master` without team confirmation.
- LLM provider: **Gemma via the Google Gemini API** (`@google/generative-ai`). Don't substitute Ollama — it forfeits the prize and prevents Vercel deployment.
- Excluded by team agreement (do not introduce): Ollama, LangChain, Zustand, Auth0.
