import Link from "next/link";
import BgArt from "@/components/BgArt";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      <BgArt />

      <div className="relative flex flex-col items-center gap-2">
        <h1 className="inverted-title">
          {'NodeBud'.split('').map((letter, i) => (
            <span key={i}>{letter}</span>
          ))}
        </h1>

        <p className="max-w-md text-center text-amber-100 text-lg -mt-5">
          Practice interviews with an AI that watches your posture, listens to
          your answers, and remembers you next time.
        </p>
        <p className="text-md text-gray-300">
          Webcam and audio are processed in your browser. We don't store video.
        </p>

        <div className="mt-4">
          <Link href="/setup" className="btn-primary">
            Start a mock interview →
          </Link>
        </div>

        <div className="flex gap-4 text-center mt-8">

          <div className="feature-card">
            <span className="text-2xl grayscale">👁</span>
            <p className="text-sm font-semibold text-amber-100">Body Language</p>
            <p className="text-xs text-gray-400 max-w-[120px]">Live posture and eye contact feedback</p>
          </div>

          <div className="feature-card">
            <span className="text-2xl grayscale">🎙</span>
            <p className="text-sm font-semibold text-amber-100">Voice Feedback</p>
            <p className="text-xs text-gray-400 max-w-[120px]">AI listens and scores your answers</p>
          </div>

          <div className="feature-card">
            <span className="text-2xl grayscale">🧠</span>
            <p className="text-sm font-semibold text-amber-100">Remembers You</p>
            <p className="text-xs text-gray-400 max-w-[120px]">Tracks progress across sessions</p>
          </div>

        </div>
      </div>
    </main>
  );
}