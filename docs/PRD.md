# CareerPrep AI — Product Requirements Document (v1.1)

**Hackathon:** BroncoHacks 2026 · Cal Poly Pomona
**Build window:** Sat 4/25 11:30 AM → Sun 4/26 12:30 PM PDT (25 hours)
**Track:** Education
**Document version:** 1.1 (post-team-alignment)

> **What changed in v1.1:** Merged teammate plan. Vision-pipeline architecture (heuristics-bundle approach), v0 parallelization, and persona styling kept. Three correctives applied: (1) Gemma served via Google Gemini API, not Ollama — Ollama forfeits the prize and prevents Vercel deployment; (2) MediaPipe throttled to 10fps; (3) State management uses React + sessionStorage (no Zustand), validation uses Zod (no LangChain). Backboard runs Option C: localStorage default, Backboard as Sunday-morning add-on if time allows.

---

## 1. Problem Statement

Job interviews — especially technical ones — reward two things: a strong verbal answer AND confident non-verbal delivery. Most students get neither feedback loop. Career centers offer mock interviews on a 2-week wait; private coaching costs $150+/hour; AI-only tools (ChatGPT, etc.) ignore body language entirely.

The students hurt most are those without industry connections: first-generation college students, ESL learners, and underrepresented groups. They walk into real interviews having literally never practiced one.

## 2. Product Vision

**A web app that gives any student a free, on-demand mock interview that watches them talk, listens to their answers, and tells them — in concrete terms — how to do better next time.** The interview adapts to the role they're applying for, simulates different interviewer personalities (warm, hostile, distracted), and remembers them across sessions so practice compounds.

## 3. Target User

- **Primary:** Cal Poly Pomona students prepping for tech internships and new-grad roles.
- **Secondary:** Any college student practicing for behavioral or technical interviews.
- **Anti-target:** Senior engineers prepping for staff+ rounds — this is not for them.

## 4. Success Metrics (for judging)

| Metric | Target | How we'll show it in the demo |
|---|---|---|
| End-to-end interview works | 1 full Q→A→score loop, no crashes | Live demo, one full question cycle |
| Multi-session memory works | AI references a past weakness in opening line | "Welcome back — last time, caching was tough for you." (localStorage MVP, Backboard if Sunday add-on lands) |
| Non-verbal feedback is real | Posture + eye-contact gauges respond to user | Slouch → gauge drops on screen |
| Tailored to JD | Question references competency from pasted JD | Paste a Google L4 JD → first question hits "system design" |
| Visible polish | Looks like a real product, not a hackathon project | v0-generated UI, not raw HTML |

## 5. Prize Strategy

Three tiers based on prize-fit and effort. **Lock these now. Don't add more during the hack.**

### Tier 1 — Primary (must win at least one)

- **Best Use of Gemma 4** (Google Swag Kits) — prize criterion explicitly requires Gemma served *via the Google Gemini API*, accessed at `mlh.link/aistudio`. Slide 14 confirms with the Gemini logo. **Ollama / local serving forfeits this prize, even though it runs the same weights.** Gemma is our "brain" for JD parsing, question generation, and answer scoring.
- **Best Use of ElevenLabs** (Beats Solo earbuds) — Gemma's text becomes a real human voice. Persona switching (Encouraging Recruiter / Strict Tech Lead / Friendly Peer; "Hostile / Chill Startup / Distracted" stretch goal if time) is our differentiation hook.
- **Education Track** — the entire app is an Education-track project by design.

### Tier 2 — Secondary (build only if Tier 1 is solid)

- **Best Use of Vercel v0** — generate the UI with v0.dev, deploy to Vercel.
- **Best Use of Backboard** (Tile Essentials) — **Option C:** the MVP uses localStorage for session persistence. If we cross hour 18 with everything green, we add Backboard as a memory-recall layer for the demo opener ("Welcome back — last time, caching tradeoffs were tricky"). Promo code `BRONCOHACKSMLH`.

### Tier 3 — Drop unless we're hours ahead

- **Best Use of Auth0 AI Agents** — agent-identity story is interesting but high effort. Per team agreement, deferred to "Phase 2" / post-hackathon. Don't start.

## 6. Functional Requirements

### 6.1 User flow

```
Landing → Setup → Interview Room → Score Report → Dashboard
            ↑                                          ↓
            └──────── (next session) ──────────────────┘
```

### 6.2 Setup page

The user must be able to:
- Paste a job description (text area, no file upload in MVP)
- See parsed competencies appear (proves Gemma is working — visible value)
- Pick an interviewer persona (Encouraging Recruiter / Strict Tech Lead / Friendly Peer)
- Click "Start Interview" → routes to interview room

### 6.3 Interview room (THE CORE LOOP)

The user must be able to:
- See their webcam feed in a clean dual-pane layout
- See live "Confidence Gauges" overlay (posture %, eye contact %)
- See the current question as text (accessibility) AND hear it spoken (ElevenLabs)
- Speak their answer; have it transcribed in real time via Web Speech API
- Click "Done with this answer" to advance to the next question
- See a final summary screen after 3–5 questions

### 6.4 Score report

The user must be able to see:
- An overall numeric score (0–100)
- Per-question scores across 5 dimensions (relevance, accuracy, structure, specificity, communication)
- 1–3 specific strengths and 1–3 specific improvements per question
- A "Save Session" button (writes to localStorage; also writes to Backboard if Sunday add-on landed)

### 6.5 Dashboard

The user must be able to see:
- A list of past sessions from localStorage (date, role title, overall score)
- A trend chart of scores over time
- (Stretch) Click a past session to expand details

## 7. Non-Functional Requirements

### 7.1 Performance budgets

| Operation | Target | Hard limit |
|---|---|---|
| JD parse → questions ready | < 4 seconds | 8 seconds |
| Question text → first audio chunk | < 1.5 seconds | 3 seconds |
| Answer end → next question audio | < 5 seconds | 10 seconds |
| Webcam frame → posture score update | < 200ms | 500ms |
| Page load (cold) | < 3 seconds | 6 seconds |

If we exceed hard limits during testing, we apply a fallback (§10).

### 7.2 Browser support

- **Tier 1:** Chrome desktop on macOS/Windows. **This is the demo browser.**
- **Tier 2:** Edge, Brave (Chromium-based should work).
- **Out of scope:** Safari, Firefox, mobile. Don't waste minutes on these.

### 7.3 Accessibility

- Skip-CV mode toggle (interview works without webcam — for users with mobility/vision differences)
- Keyboard-navigable buttons
- Question text is always visible, never audio-only
- Text-input fallback for the answer (typed instead of spoken) — this is also our venue-noise backup

### 7.4 Privacy

- No video or audio is uploaded or stored. Webcam frames are processed in-browser by MediaPipe; transcripts are sent to Gemma but not retained server-side beyond the session.
- We will say this on the landing page in one sentence. Builds trust, takes 10 seconds.

## 8. Out of Scope

To keep the build sane, we will NOT build:
- User profile photos / avatars
- Calendar integration (e.g., "schedule next session")
- Mobile-responsive layouts (desktop only)
- Email reminders / notifications
- Resume parsing (only JD parsing)
- Multiple concurrent users in the same session
- Real authentication beyond a fake "user_id" cookie (Auth0 deferred per team agreement)
- Spanish multilingual
- Video recording playback of the user's interview

## 9. Architecture Overview (the heuristics-bundle pattern)

This is the architecture pattern your teammate proposed and we're keeping — it's correct.

```
┌────────────────────── BROWSER ──────────────────────────┐
│                                                          │
│  Webcam → MediaPipe (10fps, GPU delegate)               │
│                ↓                                         │
│         X/Y/Z landmarks                                  │
│                ↓                                         │
│         Heuristic functions (in JS):                    │
│           - postureScore() per frame                    │
│           - isLookingAtCamera() per frame               │
│           - RollingScore (3-second smoothing)           │
│                ↓                                         │
│         Aggregated stats per question:                  │
│           { posture_avg: 73, eye_contact_pct: 64,       │
│             slouch_seconds: 8, look_aways: 3 }          │
│                ↓                                         │
│         Web Speech API → transcript                     │
│                ↓                                         │
│         BUNDLE: { stats, transcript, question }         │
│                ↓                                         │
└─────────────── only this bundle goes to server ─────────┘
                          ↓
                   Gemini API (Gemma 4)
                          ↓
                   Scored response + next question
```

**Why this is right:** No video over the network. Server-side cost is bounded (just JSON in/out). Vercel can host this; Ollama-locally cannot. CV runs at browser speed with no round-trip latency.

## 10. Heavy-Load Risks & What Will Hurt Us

### 10.1 Computer vision is CPU-hungry

MediaPipe Pose + Face Landmarker at 30fps × 2 models will tank a low-end laptop to 5–10fps with visible UI jank. **We will throttle to ~10fps from frame one** (frame counter, skip 2 of every 3 rAF ticks). Trend tracking is unaffected; UI stays smooth.

**Why this matters:** The demo laptop must stay responsive while CV runs. 30fps is overkill and will visibly stutter.

### 10.2 ElevenLabs has rate limits and audio latency

Their HTTP streaming endpoint takes 600–1000ms for the first audio chunk. WebSocket streaming is faster (~300ms) but more fragile. On the free tier, character quotas are shared — 5 demos in an hour could exhaust them.

**Mitigation:** Per teammate's instinct (correct), we will NOT use ElevenLabs during dev. **Do test it once at hour 0** to confirm the integration path. After that, dev uses browser TTS (`window.speechSynthesis`) until polish phase. Demo uses ElevenLabs.

### 10.3 Web Speech API is brittle

Browser-native speech recognition is Chrome-only and noise-fragile. The hackathon venue will have ambient chatter. Garbage transcripts → garbage Gemma scoring.

### 10.4 Gemma JSON drift

Even with `responseMimeType: "application/json"`, Gemma occasionally outputs malformed JSON, extra prose, or skipped fields. **Zod validates every response and retries once on failure.** If retry fails, fallback to a hardcoded question/profile. The interview never blocks.

### 10.5 Network instability at the venue

Cal Poly Pomona's WiFi will get hammered. If our app needs Vercel + Google AI + ElevenLabs — every request adds failure probability. **Hotspot in the bag.**

### 10.6 First-question dead air

Gemma latency (~500–1000ms) + ElevenLabs first chunk (~300ms WS / ~700ms HTTP) = up to 1.7 seconds of silence. **Mandatory "thinking..." UI state** with typing indicator from the moment the user clicks Start.

## 11. Backup Plans (every risk has a pre-built toggle)

Each backup is **pre-built and toggleable** so we don't scramble during the demo. Toggles via URL query params or a dev menu.

| Risk | Trigger | Backup plan | Cost to build |
|---|---|---|---|
| 10.1 CV is CPU-hungry | FPS < 15 in dev tools | Switch to **snapshot mode**: capture one frame every 3s, score it once. | 30 min |
| 10.1 CV crashes the tab | Page freezes during pose tracking | **`?cv=off` toggle** disables MediaPipe entirely. Same code path as accessibility mode. | already in scope |
| 10.2 ElevenLabs slow / failing | First chunk > 3s OR 5xx error | **Browser SpeechSynthesis fallback** (`window.speechSynthesis`). Sounds robotic, but works offline, instant, free. `?tts=browser` toggle. | 30 min |
| 10.2 ElevenLabs quota exhausted | 429 error from API | Same browser fallback. Cap demo to 3 voiced questions. | (same as above) |
| 10.3 Web Speech transcription bad | Garbled output during testing | **Typed-answer mode** with a textarea. Toggle via "Type instead" button. Demo backup if mic fails. | 20 min |
| 10.3 Mic permission denied | Browser blocks mic access | Same typed-answer mode. Show "Type your answer below" with focus on the textarea. | (same as above) |
| 10.4 Gemma JSON drift | Zod validation fails | **`callGemmaJSON` retries once** with stricter prompt. If that fails, return a hardcoded "fallback" question from `lib/fallback-questions.json` (10 generic questions). | 30 min |
| 10.4 Gemma 5xx / quota error | Any non-200 response | Same fallback array. Tiny on-screen note: "Using cached question bank." Be honest. | 15 min |
| 10.5 Vercel deploy down | Demo URL 502s | **Local dev mode demo.** `pnpm dev` running on demo laptop, hotspot for Google AI / ElevenLabs only. Practice this once Saturday night. | 0 min |
| 10.5 Google AI API down | 5xx errors | Same fallback question array. | (covered by 10.4) |
| 10.5 Backboard down (if used) | Memory recall fails | Skip the memory callback. Fall back to localStorage-only. Tier 2 prize lost gracefully; core demo unaffected. | 5 min |
| 10.6 First-question dead air | Always — this is constant | **Mandatory "thinking..." state** with typing indicator the moment the user clicks Start. Question text appears as it streams. Audio plays when ready. | 20 min |

### Universal demo-day fallback

**Pre-recorded demo video** as the absolute last resort. If everything is on fire 5 minutes before judging, we play a 90-second screen recording of the working app (recorded Sunday morning while it WAS working) and walk through it narratively.

## 12. Tech Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, server actions, Edge runtime |
| Hosting | Vercel | Free, fast, integrates with v0; **enables a public demo URL judges can try** |
| LLM | Gemma 4 via Google Gemini API (`@google/generative-ai`) | Required for prize eligibility (slide 14: Gemini logo on Gemma slide). NOT Ollama. |
| TTS | ElevenLabs (HTTP streaming) | Prize requirement; HTTP is more stable than WS for hackathons |
| ASR | Web Speech API → typed fallback | Free, in-browser, no key needed |
| CV | MediaPipe Tasks Vision (Pose + Face Landmarker), GPU delegate, **10fps throttle** | Browser-only, no server cost |
| UI | shadcn/ui via v0.dev generation, Tailwind | Fast to build, looks polished |
| State | React `useState` + `sessionStorage` mirror | No Zustand — keep dependencies thin |
| Validation | Zod | Defends against Gemma JSON drift; replaces LangChain in role of "predictable LLM output" |
| Persistence (MVP) | `localStorage` | Simple, no backend, supports session history dashboard |
| Persistence (stretch) | Backboard (Tier 2, Sunday-morning add-on) | Prize, but only if time. Promo code `BRONCOHACKSMLH`. |
| Auth | Deferred (Auth0 → post-hackathon) | Per team agreement |

> **Note (post-PRD):** the actual scaffold turned out to be Next.js 16.2.4 + React 19.2.4 + `src/app/` + npm + Tailwind v4. See `docs/PLAN.md` for the deltas.

### Explicitly NOT using

- **Ollama** — forfeits Gemma 4 prize, prevents public Vercel deployment
- **LangChain** — adds dependency weight and a learning curve. Our 30-line `callGemmaJSON` + Zod schemas do the same job for our use case
- **Zustand** — React's `useState` + `sessionStorage` is sufficient for MVP state
- **Auth0** — deferred per team agreement

## 13. Team Lanes

Per teammate's correct instinct that v0 enables parallelization:

| Lane | Owner | Hour 0–4 | Hour 4–14 | Hour 14–22 | Hour 22–25 |
|---|---|---|---|---|---|
| **A — Frontend / v0** | TBD | Next.js scaffold, v0 setup page, routing | Interview room layout, dashboard skeleton | v0 polish, dashboard charts | Demo video recording |
| **B — AI / Voice** | TBD | Google AI key, Gemma test call, Zod schemas, ElevenLabs key (one test call) | Question loop wiring, TTS proxy, fallback array | Persona voices, answer scoring | Devpost writeup |
| **C — Computer Vision** | TBD | MediaPipe scaffold, GPU delegate, webcam permissions | Posture + eye-contact heuristics, gauges, 10fps throttle | Heuristics-bundle integration | QA & demo prep |
| **D — Persistence / QA** | TBD or rotates | localStorage schema, sessionStorage mirror | Dashboard data wiring, score report | (Sunday-morning) optional Backboard add-on | QA & deploy |

If team is 3 people: D rotates across A/B/C. If 2 people: drop Backboard add-on entirely.

## 14. Definition of Done (for judging)

We will declare the project done when ALL of these are true:

- [ ] App is deployed to a public Vercel URL
- [ ] A judge can paste a JD, pick a persona, and complete one full interview question
- [ ] The AI's voice is ElevenLabs (not browser TTS) for the demo
- [ ] At least the posture gauge moves visibly when the user slouches
- [ ] A score report appears with at least 3 specific strengths/improvements
- [ ] Dashboard shows past sessions from localStorage
- [ ] Devpost submission has video, screenshots, sponsor paragraphs, GitHub link
- [ ] Devpost writeup explicitly says "Gemma 4 via the Google Gemini API"
- [ ] We have rehearsed the demo end-to-end at least twice
- [ ] All backup toggles (`?cv=off`, `?tts=browser`, typed mode) work

If any item is missing at Sunday 12:00 PM, we drop scope, not quality.

---

**The number-one rule:** A working subset that demos cleanly beats a sprawling project that crashes during judging. Every. Single. Time. Defend the core loop.
