import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
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
    </main>
  );
}