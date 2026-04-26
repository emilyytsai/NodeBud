export const runtime = "edge";

const VOICE_MAP: Record<string, string> = {
  encouraging_recruiter: process.env.ELEVENLABS_VOICE_ENCOURAGING ?? "",
  strict_tech_lead: process.env.ELEVENLABS_VOICE_STRICT ?? "",
  friendly_peer: process.env.ELEVENLABS_VOICE_PEER ?? "",
};

export async function POST(req: Request) {
  const { text, persona } = await req.json();
  const voiceId = VOICE_MAP[persona] || VOICE_MAP.encouraging_recruiter;
  const apiKey = process.env.ELEVENLABS_API_KEY ?? "";

  if (!voiceId) {
    console.warn(`[tts] no voice ID for persona="${persona}". Configured personas: ${Object.entries(VOICE_MAP).filter(([, v]) => v).map(([k]) => k).join(", ") || "(none)"}`);
    return new Response("No voice ID configured", { status: 502 });
  }
  if (!apiKey) {
    console.warn("[tts] ELEVENLABS_API_KEY is empty");
    return new Response("No API key configured", { status: 502 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.55,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "(no body)");
    const detail = `ElevenLabs ${upstream.status} ${upstream.statusText} | persona=${persona} voiceId=${voiceId.slice(0, 6)}… | ${body.slice(0, 500)}`;
    console.warn(`[tts] ${detail}`);
    return new Response(detail, { status: 502 });
  }

  // Stream directly — do NOT await arrayBuffer (breaks Edge streaming)
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
