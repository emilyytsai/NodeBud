export const runtime = "edge";

const VOICE_MAP: Record<string, string> = {
  encouraging_recruiter: process.env.ELEVENLABS_VOICE_ENCOURAGING ?? "",
  strict_tech_lead: process.env.ELEVENLABS_VOICE_STRICT ?? "",
  friendly_peer: process.env.ELEVENLABS_VOICE_PEER ?? "",
};

export async function POST(req: Request) {
  const { text, persona } = await req.json();
  const voiceId = VOICE_MAP[persona] || VOICE_MAP.encouraging_recruiter;

  if (!voiceId) {
    return new Response("No voice ID configured", { status: 502 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
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

  // Stream directly — do NOT await arrayBuffer (breaks Edge streaming)
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
