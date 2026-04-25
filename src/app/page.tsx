import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight">CareerPrep AI</h1>
      <p className="max-w-md text-center text-lg text-muted-foreground">
        Practice interviews with an AI that watches your posture, listens to
        your answers, and remembers you next time.
      </p>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Webcam and audio are processed in your browser. We don&apos;t store
        video.
      </p>
      <Link href="/setup" className={buttonVariants({ size: "lg" })}>
        Start a mock interview →
      </Link>
    </main>
  );
}
