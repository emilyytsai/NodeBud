# CareerPrep AI — MVP Build Spec (v1.1)

**Audience:** Claude Code (implementer). The human dev is supervising.
**Goal:** Demoable end-to-end loop by Sunday 12:00 PM. Polish second.
**Companion docs:** `docs/PRD.md` (the what), `docs/PLAN.md` (this repo's adapted execution plan).

> **What changed in v1.1:** Aligned with team plan. Heuristics-bundle architecture (CV → stats → server) explicit. State management uses React + sessionStorage (no Zustand). Validation uses Zod (no LangChain). Backboard moved to optional Sunday-morning Phase 4.5 add-on; localStorage is the MVP persistence layer. Gemma stays on the Gemini API path (Ollama forfeits the prize).

---

## How to use this spec

Build in **5 phases**. Each phase has:
- A **goal** — what "done" looks like
- An **estimated time budget**
- A **file checklist** — exact paths to create/modify
- A **stop-and-test checkpoint** — do not move to the next phase until this is green
- The **fallback** that this phase enables (so we know the safety net works before we keep going)

If a phase blows past 1.5x its budget, **stop and apply the fallback for that phase**, then move on. Do not let any single phase eat the whole hackathon.

---

## A note on libraries we are NOT using

- **Ollama** — forfeits the Gemma 4 prize and prevents Vercel deployment. We use Google Gemini API.
- **LangChain** — adds dependency weight. Our `callGemmaJSON` helper (30 lines) plus Zod schemas covers structured-output validation for our use case with less surface area.
- **Zustand** — React `useState` + a `sessionStorage` mirror is sufficient for the MVP. One less thing to learn during the hackathon.
- **Auth0** — deferred per team agreement.

---

## Phase 0 — Project skeleton (60 min)

### Goal
A Next.js 14 App Router project that boots, shows a landing page, and is deployed to Vercel with all environment variables in place.

> **Note (post-spec):** the actual scaffold is Next.js 16.2.4 + React 19.2.4 + `src/app/` + npm + Tailwind v4. The spec's Phase 0 was already partly done. See `docs/PLAN.md` for what changed.

### Time budget
60 minutes. Hard stop at 90.

### File checklist

```
careerprep-ai/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .gitignore                  ← MUST include .env*
├── .env.local.example          ← shape only, no real keys
├── app/
│   ├── layout.tsx
│   ├── page.tsx                ← landing page
│   ├── globals.css
│   └── api/
│       └── health/route.ts     ← returns { ok: true } — sanity check
└── README.md
```

### Setup commands

```bash
pnpm create next-app@latest careerprep-ai \
  --typescript --tailwind --app --src-dir=false \
  --import-alias "@/*"

cd careerprep-ai
pnpm add @google/generative-ai zod
pnpm add -D @types/node
```

### .env.local.example

```
GOOGLE_AI_KEY=
GEMMA_MODEL_NAME=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ENCOURAGING=
ELEVENLABS_VOICE_STRICT=
ELEVENLABS_VOICE_PEER=
NEXT_PUBLIC_DEMO_USER_ID=demo-user-1
# Phase 4.5 (optional Backboard add-on)
BACKBOARD_API_KEY=
```

### Landing page (`app/page.tsx`) — minimum

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">CareerPrep AI</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Practice interviews with an AI that watches your posture, listens to
        your answers, and remembers you next time.
      </p>
      <p className="text-xs text-muted-foreground">
        Webcam and audio are processed in your browser. We don't store video.
      </p>
      <Link
        href="/setup"
        className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        Start a mock interview →
      </Link>
    </main>
  );
}
```

### Stop-and-test checkpoint

- [ ] `pnpm dev` runs locally with no errors
- [ ] `/` loads and shows the heading
- [ ] `/api/health` returns `{ ok: true }`
- [ ] Pushed to GitHub, deployed to Vercel, **production URL** loads
- [ ] All env vars set in Vercel dashboard (placeholder values are fine; real keys come in Phase 1)

### Fallback enabled
None yet — this phase is foundation.

---

## Phase 1 — Gemma JD parsing + question generation (3 hours)

### Goal
A user can paste a JD on `/setup`, click "Generate Questions," and see a list of 3–5 tailored questions on screen. No webcam or voice yet — just text, end-to-end.

### Time budget
3 hours. Hard stop at 4.5.

### Why this phase first
The Gemma 4 prize is our top target. If Gemma integration doesn't work, nothing else matters. We need to validate the whole API path — auth, JSON mode, Zod validation, retry logic — before adding voice and CV on top.

### Pre-step: Verify the model name in AI Studio

1. Log into `aistudio.google.com` with the team Google account
2. Click "Get API key" → generate one → set as `GOOGLE_AI_KEY`
3. Open the model picker. Find the latest **Gemma** model that supports `generateContent`. Common forms: `gemma-2-9b-it`, or whatever Gemma 4 variant Google has rolled out.
4. Set `GEMMA_MODEL_NAME` to that exact string in `.env.local` AND in Vercel env vars.

### File checklist

```
lib/
├── llm.ts                       ← Google AI client
├── llm-call.ts                  ← callGemmaJSON helper with Zod retry
├── fallback-questions.json      ← 10 hardcoded questions for graceful degrade
├── schemas/
│   ├── parsed-jd.ts             ← Zod schema for JD parse output
│   ├── interview-question.ts    ← Zod schema for question
│   └── scored-answer.ts         ← Zod schema for answer scoring
└── prompts/
    ├── parse-jd.ts
    ├── next-question.ts
    └── score-answer.ts

app/
├── setup/page.tsx               ← JD textarea, persona dropdown, generate button
└── api/
    ├── parse-jd/route.ts
    └── next-question/route.ts
```

### lib/llm.ts

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_AI_KEY) {
  throw new Error("GOOGLE_AI_KEY is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// Set in .env.local from the AI Studio model picker.
// Examples seen in the wild: "gemma-2-9b-it", "gemma-3-...", "gemma-4-..."
export const GEMMA_MODEL = process.env.GEMMA_MODEL_NAME ?? "gemma-2-9b-it";

export function getGemmaModel(opts: { responseSchema?: object } = {}) {
  return genAI.getGenerativeModel({
    model: GEMMA_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
      temperature: 0.3,
    },
  });
}
```

### lib/llm-call.ts (full retry + fallback — the Zod-backed helper that replaces LangChain)

```typescript
import { z } from "zod";
import { getGemmaModel } from "./llm";

type CallOpts<T> = {
  temperature?: number;
  maxRetries?: number;
  responseSchema?: object;
  fallback?: T;  // if all retries fail, return this instead of throwing
};

export async function callGemmaJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  opts: CallOpts<T> = {}
): Promise<T> {
  const { temperature = 0.3, maxRetries = 1, responseSchema, fallback } = opts;
  const model = getGemmaModel({ responseSchema });
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const stricterSuffix = attempt > 0
        ? `\n\nPrevious response failed validation: ${String(lastError).slice(0, 200)}. Return ONLY valid JSON. No prose.`
        : "";

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}${stricterSuffix}` }],
        }],
        generationConfig: { temperature },
      });

      const raw = result.response.text();
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);  // Zod throws if shape is wrong
    } catch (e) {
      lastError = e;
      attempt++;
      if (attempt > maxRetries) {
        if (fallback !== undefined) {
          console.warn("[callGemmaJSON] Falling back. Last error:", e);
          return fallback;
        }
        throw new Error(`Gemma call failed: ${String(e).slice(0, 300)}`);
      }
    }
  }
  throw new Error("unreachable");
}
```

**Why Zod here:** Gemma will sometimes return JSON like `{"role": "engineer", "weight": "high"}` when we expect `weight: number`. Without validation, that propagates and crashes the next code path. Zod throws a clear error like *"Expected number at hard_skills[0].weight, received string"* — we catch it, retry once with stricter prompting, and if it still fails we serve the fallback. The interview never blocks.

### lib/fallback-questions.json

A static array of 10 questions, used when Gemma errors. **Build this BEFORE the API route** — it's the safety net for the rest of the hackathon.

```json
[
  {
    "question": "Tell me about a time you debugged a particularly tricky issue. Walk me through your process.",
    "targets": ["problem_solving", "communication"],
    "type": "behavioral"
  },
  {
    "question": "How would you design a URL shortener like bit.ly? Focus on the data model and the read path.",
    "targets": ["system_design"],
    "type": "system_design"
  },
  {
    "question": "Describe a project you're proud of. What was your specific contribution?",
    "targets": ["communication", "ownership"],
    "type": "behavioral"
  },
  {
    "question": "Explain the difference between a stack and a queue. When would you use each?",
    "targets": ["data_structures"],
    "type": "technical"
  },
  {
    "question": "Tell me about a time you disagreed with a teammate. How did you resolve it?",
    "targets": ["teamwork", "communication"],
    "type": "behavioral"
  },
  {
    "question": "Walk me through what happens when you type a URL into your browser and hit enter.",
    "targets": ["networking", "fundamentals"],
    "type": "technical"
  },
  {
    "question": "How do you decide between using a SQL database vs a NoSQL database?",
    "targets": ["databases", "system_design"],
    "type": "technical"
  },
  {
    "question": "Describe a time you had to learn a new technology quickly. How did you approach it?",
    "targets": ["learning_agility"],
    "type": "behavioral"
  },
  {
    "question": "What's the time complexity of binary search, and why does sorting the array first matter?",
    "targets": ["algorithms"],
    "type": "technical"
  },
  {
    "question": "Tell me about a technical decision you made that you later regretted. What did you learn?",
    "targets": ["judgment", "self_awareness"],
    "type": "behavioral"
  }
]
```

### Schemas, prompts, route handlers

Use the prompts and Zod schemas from the playbook §5.1, §5.2, §5.3. Don't recreate them here — reference and import.

For the route handlers, the pattern is:

```typescript
// app/api/parse-jd/route.ts
import { callGemmaJSON } from "@/lib/llm-call";
import { ParsedJdSchema, PARSED_JD_RESPONSE_SCHEMA } from "@/lib/schemas/parsed-jd";
import { PARSE_JD_SYSTEM, PARSE_JD_USER } from "@/lib/prompts/parse-jd";

export async function POST(req: Request) {
  try {
    const { jdText } = await req.json();
    if (!jdText || typeof jdText !== "string" || jdText.length < 50) {
      return Response.json(
        { error: "Job description must be at least 50 characters." },
        { status: 400 }
      );
    }

    const parsed = await callGemmaJSON(
      PARSE_JD_SYSTEM,
      PARSE_JD_USER(jdText),
      ParsedJdSchema,
      {
        responseSchema: PARSED_JD_RESPONSE_SCHEMA,
        fallback: {
          // If Gemma fails entirely, default to a generic SWE profile
          role_title: "Software Engineer",
          seniority: "junior" as const,
          role_type: "fullstack" as const,
          hard_skills: [
            { name: "JavaScript", required: true, weight: 0.8 },
            { name: "Problem solving", required: true, weight: 1.0 },
          ],
          soft_skills: ["Communication", "Teamwork"],
          domain_keywords: [],
          suggested_question_count: 4,
          confidence: 0.3,
        },
      }
    );

    return Response.json(parsed);
  } catch (e) {
    return Response.json(
      { error: String(e).slice(0, 300) },
      { status: 500 }
    );
  }
}
```

### Setup page (skeleton, no Zustand)

`app/setup/page.tsx` is a client component using `useState` + `useRouter`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [jdText, setJdText] = useState("");
  const [persona, setPersona] = useState("encouraging_recruiter");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    const res = await fetch("/api/parse-jd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdText }),
    });
    const data = await res.json();
    setParsed(data);
    setLoading(false);
  };

  const handleStartInterview = () => {
    // Persist setup state to sessionStorage, then route
    const sessionId = `s_${Date.now()}`;
    sessionStorage.setItem(`session:${sessionId}:setup`, JSON.stringify({
      jdText, persona, parsed,
    }));
    router.push(`/interview/${sessionId}`);
  };

  // ... render textarea, persona <select>, button, parsed competencies list
}
```

**State pattern:** Active interview state is `useState` in the page component, mirrored to `sessionStorage` via `useEffect` on every change. Refresh-resilient. No Zustand needed.

### Stop-and-test checkpoint

- [ ] Pasting a real JD (e.g., a Google L4 SWE listing) returns parsed competencies in < 8s
- [ ] Pasting gibberish returns either a low-confidence parse or the fallback profile (no crash)
- [ ] Killing the GOOGLE_AI_KEY env var in Vercel and redeploying shows the fallback path works
- [ ] Console shows ZERO unhandled errors during the happy path
- [ ] Three different JDs produce visibly different competency lists

### Fallback enabled
- ✅ Gemma 5xx → fallback object returned
- ✅ JSON drift → Zod retry → fallback after retry
- ✅ Demo can continue even if Google AI is fully down

---

## Phase 2 — Webcam + MediaPipe heuristics (4 hours)

### Goal
On `/interview/new`, the user grants camera permission, sees their video, and sees two numeric gauges (Posture, Eye Contact) updating live as they move. **Heuristics aggregate into a stats object that we'll bundle with the transcript in Phase 3.**

### Time budget
4 hours. Hard stop at 6.

### Why this phase second
CV is our differentiator. Most hackathon interview tools are voice-only. This is what makes the demo memorable.

### File checklist

```
lib/
├── mediapipe/
│   ├── init.ts                  ← initLandmarkers() factory
│   └── types.ts                 ← Landmarks type alias
├── scoring/
│   ├── posture.ts               ← postureScore() + RollingScore class
│   ├── eye-contact.ts           ← EyeContactTracker class
│   ├── confidence.ts            ← composite score
│   └── question-stats.ts        ← QuestionStats accumulator (the bundle)

components/
└── interview/
    ├── permissions-gate.tsx     ← "Enable camera" button
    ├── webcam-view.tsx          ← <video> element with srcObject
    ├── confidence-gauges.tsx    ← two numeric gauges
    └── tracking-loop.tsx        ← rAF loop, throttled to ~10fps

app/
└── interview/
    └── [id]/page.tsx            ← assembles all of the above
```

### Critical implementation notes

1. **Dynamic import only.** MediaPipe must NOT be imported at module top level:

```typescript
"use client";
import dynamic from "next/dynamic";
const TrackingLoop = dynamic(
  () => import("@/components/interview/tracking-loop"),
  { ssr: false }
);
```

2. **GPU delegate from frame one.** See playbook §6.1 for the exact `createFromOptions` config. Use `delegate: "GPU"`.

3. **Throttle to ~10fps** (this is the key fix vs. teammate's 30fps plan):

```typescript
let frameCount = 0;
const FRAME_SKIP = 3;  // 30fps / 3 = 10fps inference

function loop() {
  if (videoRef.current && frameCount++ % FRAME_SKIP === 0) {
    const ts = performance.now();
    const poseResult = pose.detectForVideo(videoRef.current, ts);
    const faceResult = face.detectForVideo(videoRef.current, ts);
    // ... score and update state
  }
  rafId = requestAnimationFrame(loop);
}
```

4. **Use the seated-aware scoring math** from playbook §6.2 and §6.3. Do NOT use z-values or hip-based torso checks.

5. **Sanity check on first frame.** Log `face.faceLandmarks[0].length` once. If it's 468, iris refinement is off and eye contact will silently report 0%.

### lib/scoring/question-stats.ts (the heuristics-bundle accumulator)

This is the structure that gets sent to Gemma alongside the transcript when scoring an answer. **This is the architectural pattern your teammate proposed and we're keeping.**

```typescript
export class QuestionStats {
  private postureSamples: number[] = [];
  private eyeContactHits = 0;
  private eyeContactSamples = 0;
  private slouchFrames = 0;
  private lookAwayCount = 0;
  private wasLookingLastFrame = true;
  private startTime = performance.now();

  sample(opts: { posture: number | null; lookingAtCamera: boolean }) {
    if (opts.posture !== null) {
      this.postureSamples.push(opts.posture);
      if (opts.posture < 60) this.slouchFrames++;
    }
    this.eyeContactSamples++;
    if (opts.lookingAtCamera) {
      this.eyeContactHits++;
    } else if (this.wasLookingLastFrame) {
      this.lookAwayCount++;  // count transitions, not raw frames
    }
    this.wasLookingLastFrame = opts.lookingAtCamera;
  }

  finalize(): QuestionStatsResult {
    const elapsedSec = (performance.now() - this.startTime) / 1000;
    const postureAvg = this.postureSamples.length === 0
      ? null
      : this.postureSamples.reduce((a, b) => a + b, 0) / this.postureSamples.length;

    return {
      duration_seconds: Math.round(elapsedSec),
      posture_avg: postureAvg === null ? null : Math.round(postureAvg),
      eye_contact_pct: this.eyeContactSamples === 0
        ? null
        : Math.round((this.eyeContactHits / this.eyeContactSamples) * 100),
      slouch_seconds: Math.round(this.slouchFrames / 10),  // 10fps
      look_away_count: this.lookAwayCount,
    };
  }
}

export type QuestionStatsResult = {
  duration_seconds: number;
  posture_avg: number | null;
  eye_contact_pct: number | null;
  slouch_seconds: number;
  look_away_count: number;
};
```

When the user clicks "Done with this answer," we call `stats.finalize()` and bundle the result with the transcript for Gemma.

### Permissions gate

`components/interview/permissions-gate.tsx`:

```tsx
"use client";
import { useState } from "react";

export function PermissionsGate({ onGranted }: { onGranted: (s: MediaStream) => void }) {
  const [error, setError] = useState<string | null>(null);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      onGranted(stream);
    } catch (e) {
      setError("Camera/mic access denied. You can still type your answers — click 'Skip CV' below.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-2xl font-semibold">Ready your camera</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        We use your webcam in-browser to score your posture and eye contact.
        Nothing is uploaded or recorded.
      </p>
      <button onClick={requestAccess} className="rounded-md bg-black px-6 py-3 text-white">
        Enable camera and mic
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <a href="?cv=off" className="text-sm underline text-muted-foreground">
        Skip CV — type my answers instead
      </a>
    </div>
  );
}
```

### Stop-and-test checkpoint

- [ ] Camera permission request appears once
- [ ] Video preview shows the user
- [ ] Posture gauge changes when the user slouches forward (drops by 20+)
- [ ] Eye contact gauge changes when the user looks away
- [ ] **Frame rate stays above 25fps in DevTools Performance panel** (this is the "is 10fps throttling working" check)
- [ ] `?cv=off` query param disables MediaPipe entirely and shows a "CV disabled" state
- [ ] Tab survives a 5-minute idle session (no memory leak)
- [ ] `QuestionStats.finalize()` returns sensible values after a 30-second session

### Fallback enabled
- ✅ Permission denied → "Skip CV" link → `?cv=off` mode
- ✅ Low FPS detected → snapshot mode (build this only if needed)
- ✅ Mid-demo crash → typed-answer mode (Phase 3 dependency)

---

## Phase 3 — ElevenLabs voice + answer loop (4 hours)

### Goal
The full interview loop works: question is spoken aloud → user answers (mic OR typed) → CV stats + transcript bundled → Gemma scores → next question generated → repeat for 3–5 questions → final score report.

### Time budget
4 hours. Hard stop at 6.

### Phase 3 dev rule (per teammate's correct instinct)
**ElevenLabs is expensive (free tier character quota).** Test the integration ONCE at the start of Phase 3 to confirm the API path works. After that, develop with browser TTS (`window.speechSynthesis`). Switch to ElevenLabs only at Phase 4 polish time.

### File checklist

```
lib/
├── elevenlabs.ts                ← TTS client (HTTP streaming)
├── speech-recognition.ts        ← Web Speech wrapper + typed fallback
└── prompts/
    └── score-answer.ts

app/
└── api/
    ├── tts/route.ts             ← export const runtime = 'edge'
    └── score-answer/route.ts

components/
└── interview/
    ├── audio-player.tsx         ← plays streamed audio, browser TTS fallback
    ├── answer-input.tsx         ← mic button + typed-fallback textarea
    ├── question-panel.tsx       ← shows current question + transcript
    └── thinking-indicator.tsx   ← three-dot pulse during latency
```

### app/api/tts/route.ts (Edge runtime — critical)

```typescript
export const runtime = "edge";

const VOICE_MAP: Record<string, string> = {
  encouraging_recruiter: process.env.ELEVENLABS_VOICE_ENCOURAGING ?? "",
  strict_tech_lead: process.env.ELEVENLABS_VOICE_STRICT ?? "",
  friendly_peer: process.env.ELEVENLABS_VOICE_PEER ?? "",
};

export async function POST(req: Request) {
  const { text, persona } = await req.json();
  const voiceId = VOICE_MAP[persona] || VOICE_MAP.encouraging_recruiter;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.7 },
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("TTS upstream failed", { status: 502 });
  }

  // Forward the stream — DO NOT await arrayBuffer
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
```

### Browser TTS fallback (default during dev)

`components/interview/audio-player.tsx` should default to browser TTS in dev and switch based on a flag:

```typescript
function speakBrowser(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

async function speakElevenLabs(text: string, persona: string) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, persona }),
  });
  if (!res.ok) {
    speakBrowser(text);  // graceful fallback
    return;
  }
  const audioBlob = await res.blob();
  const url = URL.createObjectURL(audioBlob);
  new Audio(url).play();
}

// Use ElevenLabs by default; allow ?tts=browser query param to force fallback
const useBrowser = new URLSearchParams(window.location.search).get("tts") === "browser";
const speak = useBrowser ? speakBrowser : (text: string) => speakElevenLabs(text, persona);
```

### Score-answer route — the heuristics bundle in action

```typescript
// app/api/score-answer/route.ts
import { callGemmaJSON } from "@/lib/llm-call";
import { ScoredAnswerSchema } from "@/lib/schemas/scored-answer";
import { SCORE_ANSWER_SYSTEM, SCORE_ANSWER_USER } from "@/lib/prompts/score-answer";

export async function POST(req: Request) {
  const body = await req.json();
  // body shape:
  // {
  //   question, targets, transcript,
  //   stats: { posture_avg, eye_contact_pct, slouch_seconds, look_away_count, duration_seconds },
  //   roleTitle, seniority, accessibilityMode
  // }

  const scored = await callGemmaJSON(
    SCORE_ANSWER_SYSTEM,
    SCORE_ANSWER_USER(body),
    ScoredAnswerSchema,
    {
      fallback: {
        scores: { content_relevance: 5, technical_accuracy: 5, structure: 5, specificity: 5, communication: 5 },
        overall: 50,
        strengths: ["You completed the question."],
        improvements: ["Try giving a more specific example next time."],
        weak_competencies: [],
        non_verbal_feedback: null,
        memory_writeback: null,
      },
    }
  );

  return Response.json(scored);
}
```

### Speech recognition wrapper

`lib/speech-recognition.ts` wraps the browser's `SpeechRecognition` API and falls through to a textarea on any error:

```typescript
export function createRecognizer(onResult: (text: string) => void, onError: () => void) {
  const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
  if (!SR) {
    onError();
    return null;
  }
  const recognizer = new SR();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.onresult = (event: any) => {
    const text = Array.from(event.results)
      .map((r: any) => r[0].transcript)
      .join(" ");
    onResult(text);
  };
  recognizer.onerror = onError;
  return recognizer;
}
```

`AnswerInput` always renders the typed textarea; mic mode just auto-fills it. User can edit before submitting. This is robust to noise and to mic permission failures.

### Interview state machine (React state + sessionStorage, no Zustand)

`/interview/[id]/page.tsx` runs a simple state machine:

```
LOADING_INTRO → SPEAKING_QUESTION → AWAITING_ANSWER →
  SCORING_ANSWER → (more questions? → SPEAKING_QUESTION : SHOW_REPORT)
```

```typescript
const [state, setState] = useState<InterviewState>({
  status: "loading_intro",
  questionIndex: 0,
  questions: [],
  answers: [],
  scores: [],
});

// Mirror to sessionStorage on every change
useEffect(() => {
  sessionStorage.setItem(`session:${sessionId}:state`, JSON.stringify(state));
}, [sessionId, state]);

// Restore on mount
useEffect(() => {
  const saved = sessionStorage.getItem(`session:${sessionId}:state`);
  if (saved) setState(JSON.parse(saved));
}, [sessionId]);
```

### Stop-and-test checkpoint

- [ ] Click "Start Interview" → first question audio plays within 3s
- [ ] User speaks → transcript appears in real time
- [ ] Click "Done with answer" → score is computed → next question audio plays
- [ ] After 3 questions, score report renders with strengths and improvements
- [ ] Score report references CV stats (e.g., "You looked away 5 times during this answer")
- [ ] `?tts=browser` swaps to robotic browser voice (still works)
- [ ] `?cv=off` lets the user complete the loop without webcam
- [ ] Mic permission denied → typed textarea takes focus automatically
- [ ] Refreshing the interview page restores state from sessionStorage

### Fallback enabled
- ✅ ElevenLabs slow/down → browser TTS (`?tts=browser`)
- ✅ Mic broken → typed answers (default textarea always visible)
- ✅ Web Speech transcription bad → user edits textarea before submitting

---

## Phase 4 — Polish, dashboard, deploy (4 hours)

### Goal
The app looks like a product, not a hackathon project. Dashboard reads from localStorage and shows past sessions with a trend chart. ElevenLabs is enabled (this is when we burn the character quota).

### Time budget
4 hours. Hard stop at 5.

### File checklist

```
lib/
└── session-store.ts             ← localStorage read/write helpers

components/
├── ui/                          ← v0-generated shadcn components
└── dashboard/
    ├── trend-chart.tsx          ← simple line chart
    └── session-card.tsx

app/
└── dashboard/page.tsx
```

### lib/session-store.ts (localStorage-backed persistence)

```typescript
const KEY = "careerprep:sessions";

export type StoredSession = {
  id: string;
  date: string;          // ISO timestamp
  role_title: string;
  persona: string;
  overall_score: number;
  questions: Array<{
    question: string;
    transcript: string;
    score: number;
    strengths: string[];
    improvements: string[];
  }>;
  // For the optional Backboard memory recall (Phase 4.5):
  weak_competencies: string[];
};

export function listSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSession(session: StoredSession) {
  const all = listSessions();
  all.unshift(session);  // newest first
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));  // cap at 50
}
```

### v0 generation prompts to use

Open v0.dev and generate (NOT in the repo, just to extract components):

1. *"A dual-pane interview practice UI. Left pane: webcam feed with two circular gauges overlaid showing 'Posture 78%' and 'Eye Contact 84%'. Right pane: a question card showing the current interview question, a microphone button, and a transcribing text area. Dark mode, professional, slightly futuristic."*

2. *"A dashboard for an interview practice app. Top: a line chart showing 'Confidence Score' over the last 5 sessions. Below: a list of session cards, each showing date, role title, overall score, and a 'View Details' button. Clean, modern, light mode."*

Take v0's output, paste into the relevant files, adapt to use real props.

### Pre-seed localStorage for the demo

Saturday night, in browser console on the demo laptop:

```javascript
const SEED = [
  { id: "s1", date: "2026-04-08T14:00:00Z", role_title: "Frontend Engineer Intern", persona: "encouraging_recruiter", overall_score: 72, questions: [], weak_competencies: ["system_design"] },
  { id: "s2", date: "2026-04-15T16:30:00Z", role_title: "Frontend Engineer Intern", persona: "strict_tech_lead", overall_score: 68, questions: [], weak_competencies: ["caching", "system_design"] },
  { id: "s3", date: "2026-04-20T19:00:00Z", role_title: "Frontend Engineer Intern", persona: "strict_tech_lead", overall_score: 81, questions: [], weak_competencies: ["caching"] },
  { id: "s4", date: "2026-04-23T15:00:00Z", role_title: "Frontend Engineer Intern", persona: "encouraging_recruiter", overall_score: 76, questions: [], weak_competencies: [] },
];
localStorage.setItem("careerprep:sessions", JSON.stringify(SEED));
```

This makes the dashboard look real for the demo video. Non-monotonic scores (72 → 68 → 81 → 76) feel authentic — perfect monotonic growth looks fake.

### Stop-and-test checkpoint

- [ ] Dashboard `/dashboard` loads and shows seeded sessions with non-monotonic scores
- [ ] Trend chart renders and looks like a real line chart
- [ ] Completing a real interview adds a new entry to the dashboard
- [ ] All pages have consistent header/footer
- [ ] ElevenLabs voice is now playing (not browser TTS) for the demo
- [ ] Production deploy is live and demo URL works in incognito

### Fallback enabled
- ✅ localStorage corrupted → return empty array (graceful)
- ✅ ElevenLabs fails → browser TTS still works (Phase 3 fallback)

---

## Phase 4.5 — Backboard add-on (OPTIONAL, only if hour 18 reached green)

### Goal
Add Backboard as a memory recall layer on top of localStorage. The demo opener becomes "Welcome back — last time, [weak_competency] was tough for you."

### Time budget
3 hours max. **Skip this entirely if Phase 4 isn't fully green.**

### Decision gate (read this before starting Phase 4.5)

Only proceed if ALL of these are true at hour 18:
- [ ] Production deploy is live and stable
- [ ] Full interview loop works end-to-end
- [ ] Dashboard with seeded data renders cleanly
- [ ] Demo video script is drafted
- [ ] No blocking bugs

If ANY are false: skip Phase 4.5 entirely. Backboard is a Tier 2 prize, not a Tier 1. Don't sacrifice the demo for it.

### File checklist

```
lib/
└── backboard.ts                 ← memory client wrapper
```

### lib/backboard.ts (graceful degradation built in)

```typescript
// Read Backboard's docs at backboard.com to confirm exact API shape.
// This is a defensive wrapper that always falls back to localStorage on error.

const API_BASE = "https://api.backboard.io/v1";  // VERIFY in their docs

export async function writeMemory(userId: string, memory: {
  type: "weak_area" | "strength" | "preference";
  competency: string;
  evidence: string;
  confidence: number;
}) {
  if (!process.env.BACKBOARD_API_KEY) return null;  // not configured, skip silently
  try {
    const res = await fetch(`${API_BASE}/memories`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BACKBOARD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId, ...memory }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.warn("[backboard] writeMemory failed; continuing with localStorage only");
    return null;
  }
}

export async function recallMemories(userId: string, query: string) {
  if (!process.env.BACKBOARD_API_KEY) return [];
  try {
    const res = await fetch(`${API_BASE}/recall`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BACKBOARD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId, query, limit: 3 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.memories ?? [];
  } catch {
    return [];
  }
}
```

### Hybrid recall pattern

The app reads from BOTH sources and prefers Backboard if it returns results:

```typescript
async function getRecentWeakAreas(userId: string): Promise<string[]> {
  // Try Backboard first
  const memories = await recallMemories(userId, "weak areas");
  if (memories.length > 0) {
    return memories.map(m => m.competency);
  }
  // Fall back to localStorage
  const sessions = listSessions();
  const weakAreas = sessions
    .slice(0, 3)
    .flatMap(s => s.weak_competencies)
    .filter((v, i, a) => a.indexOf(v) === i);  // dedupe
  return weakAreas;
}
```

This way: Backboard down → graceful degradation to localStorage → demo still works → Tier 2 prize lost gracefully but Tier 1 intact.

### Stop-and-test checkpoint

- [ ] Backboard write succeeds for a test session
- [ ] Backboard recall returns memories from earlier writes
- [ ] Killing the BACKBOARD_API_KEY env var causes graceful fallback to localStorage
- [ ] First question of demo says "Welcome back, [name] — last time, [weak_area] was tough for you"
- [ ] If Backboard is down, app silently uses localStorage (no error visible to user)

---

## Phase 5 — Devpost submission + demo video (3 hours)

### Goal
Devpost submitted. Video uploaded. Repo public. Demo rehearsed twice.

### Time budget
3 hours. Hard stop at 12:00 PM Sunday — no exceptions.

### Checklist

- [ ] Record 90-second screen capture using Loom or QuickTime
- [ ] Script: hook (12s) → memory callback opener if Phase 4.5 landed (20s) → live interview snippet (25s) → score report (15s) → dashboard (10s) → sponsor montage (8s)
- [ ] Upload to YouTube (unlisted) or Loom
- [ ] Embed in Devpost
- [ ] Fill out "Built with" tags: `gemma`, `gemini-api`, `google-ai-studio`, `elevenlabs`, `vercel`, `nextjs`, `mediapipe`, `tailwindcss`, plus `backboard` only if Phase 4.5 landed
- [ ] Write 1 paragraph per claimed prize, naming the integration specifically
- [ ] **Mention "Gemma 4 via the Google Gemini API" explicitly** — prize criterion
- [ ] Verify GitHub repo is public, has README, has no `.env` leaks (`git log --all --full-history -- .env*`)
- [ ] All teammates listed on Devpost submission
- [ ] **Click Submit.** Drafts don't count.

### Pre-recorded backup video

Record a SECOND copy of the demo while everything's working. If something breaks 5 minutes before judging, this is the absolute fallback — play the recording, narrate over it.

---

## Build order at a glance

| Phase | Hours | Cumulative | Outcome |
|---|---|---|---|
| 0. Skeleton | 1 | 1 | App boots, deploys |
| 1. Gemma loop | 3 | 4 | Questions generate from JD |
| 2. CV gauges + heuristics bundle | 4 | 8 | Posture + eye contact live |
| 3. Voice + answer loop | 4 | 12 | Full interview cycle works |
| 4. Polish + dashboard | 4 | 16 | Looks like a product |
| 4.5. Backboard add-on (OPTIONAL) | 3 | 19 | Tier 2 prize claimed |
| 5. Submit | 3 | 22 (or 19 w/o 4.5) | Devpost done |

**Total: 19–22 hours of build, 3–6 hours of slack.** That slack is for sleep, debugging, demo prep, and the inevitable surprise.

If we're at hour 12 with phases 0–2 done but Phase 3 broken, we drop voice (use browser TTS) and skip Phase 4.5 entirely. The core loop ships. Tier 1 prizes still in play.

---

## What Claude Code should NOT do

- Don't add Ollama, LangChain, Zustand, or Auth0 — these were explicitly excluded after team alignment
- Don't add features not in this spec without checking with the human dev
- Don't change the tech stack (no swapping Next.js for Remix, no swapping Gemini API for Ollama)
- Don't add dependencies beyond what's listed unless absolutely necessary
- Don't write tests — there's no time for tests in a 25-hour build
- Don't refactor code that's already working — leave it
- Don't try to fix the v0-generated CSS unless it's literally broken
- Don't push to the production branch without the dev confirming
- Don't run MediaPipe at 30fps — throttle to 10fps, always

---

## When in doubt

If you hit a question this spec doesn't answer, optimize for these in order:
1. **Will this break the demo?** If yes, fix it. If no, defer.
2. **Does this help win a Tier 1 prize?** If yes, do it. If no, defer.
3. **Is this in the build window?** If we're past the phase budget, apply the fallback.
4. **Default to less.** Hackathon projects fail by adding, not by cutting.

The number-one rule: **A working subset that demos cleanly beats a sprawling project that crashes during judging.**

Now go build.
