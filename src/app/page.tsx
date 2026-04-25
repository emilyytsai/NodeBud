import Link from "next/link";
import BgArt from "@/components/BgArt";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8 overflow-hidden">
      <BgArt />

      <div className="relative flex flex-col items-center gap-6">

        <h1 className="inverted-title">
          {'NodeBud'.split('').map((letter, i) => (
            <span key={i}>{letter}</span>
          ))}
        </h1>

        <p className="max-w-md text-center text-amber-100 text-lg -mt-10">
          Practice interviews with an AI that watches your posture, listens to
          your answers, and remembers you next time.
        </p>
        <p className="text-md text-gray-300">
          Webcam and audio are processed in your browser. We don't store video.
        </p>
        <Link
          href="/setup" className="btn-primary"> Start a mock interview →
        </Link>
      </div>
    </main>
  );
}