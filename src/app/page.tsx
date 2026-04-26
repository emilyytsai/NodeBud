import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8 pt-20 overflow-hidden">
      
      <div className="fixed inset-0 bg-black/2 z-0 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-2 -mt-6 w-full max-w-4xl">
        <h1 className="inverted-title text-center">
          {'NodeBud'.split('').map((letter, i) => (
            <span key={i}>{letter}</span>
          ))}
        </h1>

        <p className="max-w-md sm:max-w-lg text-center text-amber-100 text-base sm:text-lg -mt-5 px-4">
          Practice interviews with an AI that watches your posture, listens to
          your answers, and remembers you next time.
        </p>
        <p className="text-sm sm:text-md text-center text-gray-300 px-4">
          Webcam and audio are processed in your browser. We don't store video.
        </p>

        <div className="btn-wrapper mt-4 -mb-4 w-auto">
          <Link href="/setup" className="btn-primary whitespace-nowrap">
            Start a mock interview →
          </Link>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 text-sm text-gray-300 hover:text-amber-100 underline-offset-4 hover:underline transition-colors"
        >
          View past sessions →
        </Link>

        <div className="flex flex-col sm:flex-row gap-4 text-center mt-5 w-full justify-center">
          <div className="feature-card mx-auto sm:mx-0">
            <span className="text-3xl grayscale">👁️</span>
            <p className="text-sm font-semibold text-amber-100">Body Language</p>
            <p className="text-xs text-gray-400 max-w-[120px]">Live posture and eye contact feedback</p>
          </div>

          <div className="feature-card mx-auto sm:mx-0">
            <span className="text-3xl grayscale">🔊</span>
            <p className="text-sm font-semibold text-amber-100">Voice Feedback</p>
            <p className="text-xs text-gray-400 max-w-[120px]">AI listens and scores your answers</p>
          </div>

          <div className="feature-card mx-auto sm:mx-0">
            <span className="text-3xl grayscale">🧠</span>
            <p className="text-sm font-semibold text-amber-100">Remembers You</p>
            <p className="text-xs text-gray-400 max-w-[120px]">Tracks progress across sessions</p>
          </div>
        </div>
      </div>
    </main>
  );
}