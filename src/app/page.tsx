import Link from "next/link";
import BgArt from "@/components/BgArt";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      <BgArt />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold">NodeBud</h1>
        <p className="max-w-md text-center text-gray-500">
          Practice interviews with an AI that watches your posture, listens to
          your answers, and remembers you next time.
        </p>
        <p className="text-xs text-gray-400">
          Webcam and audio are processed in your browser. We don't store video.
        </p>
        <Link
          href="/setup"
          className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800"
        >
          Start a mock interview →
        </Link>
      </div>
    </main>
  );
}