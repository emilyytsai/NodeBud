# Build Status

**Last updated:** 2026-04-25 — handoff after Phase 0
**Read order for a fresh Claude Code:** `CLAUDE.md` → this file → `docs/PLAN.md` → (drill into `docs/PRD.md` / `docs/MVP-SPEC.md` as needed)

## ✅ What's done — Phase 0: Scaffold hardening

- Default Next.js scaffold replaced with CareerPrep landing page (heading, privacy line, "Start a mock interview" CTA → `/setup`)
- shadcn/ui initialized: `style: "base-nova"` (**Base UI under the hood, NOT Radix** — `Button` has no `asChild` prop), `baseColor: "neutral"`
- shadcn primitives installed in `src/components/ui/`: `button`, `card`, `textarea`, `select`, `label`, `slider`, `sonner`, `badge`, `separator`
- `src/app/layout.tsx` — CareerPrep metadata, `<Toaster />` mount, Geist sans aligned to `--font-sans`
- `src/app/api/health/route.ts` — returns `{ ok: true }`
- `.env.local.example` — expanded with `GEMMA_MODEL_NAME`, three `ELEVENLABS_VOICE_*` keys, `BACKBOARD_API_KEY`, `NEXT_PUBLIC_DEMO_USER_ID`
- Local `.env.local` with placeholder values exists on Brian's machine (gitignored — Emily must create her own)

### Verified locally (Brian's machine, 2026-04-25)
- `npm run build` — passes (TypeScript clean, 5 static pages + 1 dynamic route)
- `GET /api/health` → `200 {"ok":true}`
- `GET /` → `200`, contains "CareerPrep AI", "Start a mock interview", `/setup`
- Dev server boots in ~1s

### ⚠️ Outstanding from Phase 0
- **Vercel deploy** — interactive, requires team auth. Run `npx vercel link` then `npx vercel --prod` from this repo. Set env vars in dashboard.

## ▶️ What's next — Phase 1: Gemma JD parsing + question generation

Full plan: `docs/PLAN.md` § Phase 1. Detailed code: `docs/MVP-SPEC.md` § Phase 1.

### Pre-steps before any code (anyone can do)

1. Generate Google AI Studio API key at https://aistudio.google.com → Get API Key
2. Pick a Gemma model from the AI Studio model picker that supports `generateContent`
3. Add to **both** `.env.local` and Vercel env vars:
   ```
   GOOGLE_AI_KEY=<paste>
   GEMMA_MODEL_NAME=<model id from AI Studio>
   ```

### First three files to create (in this order — they are the safety net for every later phase)

1. `src/lib/llm.ts` — Google AI client wrapper (verbatim code in `docs/MVP-SPEC.md` § Phase 1 → "lib/llm.ts")
2. `src/lib/llm-call.ts` — `callGemmaJSON` helper with Zod retry + fallback (verbatim code in spec)
3. `src/lib/fallback-questions.json` — 10 hardcoded questions (verbatim JSON in spec)

Once those three exist, build out the schemas, prompts, API routes, and `/setup` page in the order listed in `docs/PLAN.md` § Phase 1.

## Lane assignments (PRD §13)

Fill these in once the team coordinates. Suggested mapping for Phase 1+:

- **Lane A — Frontend / v0:** Phase 1 setup page UI; Phase 4 dashboard polish
- **Lane B — AI / Voice:** Phase 1 Gemma calls + schemas + prompts; Phase 3 ElevenLabs + score-answer route
- **Lane C — Computer Vision:** Phase 2 MediaPipe + scoring + heuristics-bundle integration
- **Lane D — Persistence / QA:** Phase 1-3 fallback wiring; Phase 4 localStorage + dashboard data; Phase 4.5 Backboard (gated)

If team is 3 people, D rotates across A/B/C.

## Don't forget (rules from PRD/spec)

- **Do not push to `master`** without team confirmation. Working branch is `brian`.
- **Do not introduce** Ollama, LangChain, Zustand, or Auth0 — excluded by team agreement.
- **MediaPipe at 10fps** (`FRAME_SKIP = 3`), never 30fps.
- **`/api/tts` uses `export const runtime = "edge"`** so streaming works (default Node runtime buffers audio).
- **Devpost copy must say "Gemma 4 via the Google Gemini API"** verbatim — Tier 1 prize criterion.
- **Backboard is hour-18 gated.** Skip entirely if Phases 0-4 aren't all green by then.

## Stack reminders (because the spec was written for Next.js 14)

This repo is **Next.js 16.2.4 + React 19.2.4 + `src/app/` + npm + Tailwind v4**. The full delta table is in `docs/PLAN.md` § "Stack Deltas vs. Spec". The two most likely to bite:

1. **Async params.** Dynamic routes get `params: Promise<…>`. Server components: `await params`. Client components: `use(params)` from React.
2. **shadcn 4.x on Base UI.** No `asChild` on `Button`. Use `buttonVariants` directly: `<Link className={buttonVariants({ size: "lg" })}>`. The existing `src/app/page.tsx` shows this pattern.
