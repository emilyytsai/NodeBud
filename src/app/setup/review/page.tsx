"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ParsedCompetencies } from "@/components/setup/parsed-competencies";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [parsed, setParsed] = useState<ParsedJd | null>(null);
  const [questionCount, setQuestionCount] = useState<number | undefined>(undefined);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const raw = sessionStorage.getItem(`session:${sessionId}:setup`);
    if (!raw) return;
    const data = JSON.parse(raw);
    setParsed(data.parsed);
    setQuestionCount(data.questionCount);
  }, [sessionId]);

  const handleStartInterview = () => {
    router.push(`/interview/${sessionId}`);
  };

  if (!parsed) return null;

  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-8">
      <Link
        href="/setup"
        className="inline-block text-amber-100 hover:text-white hover:-translate-y-1 transition"
      >
        ← &nbsp;Back
      </Link>

      <div>
        <h1 className="setup-title">Review your interview</h1>
        <p className="mt-2 text-amber-100">
          Here&apos;s what we found. Start your interview when you&apos;re ready.
        </p>
      </div>

      <div
        onClick={() => setClicked(!clicked)}
        className={`glass-input rounded-xl border p-6 transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
          clicked
            ? "border-white/70 border-2"
            : "border-white/20 hover:border-white/70"
        }`}
      >
        <ParsedCompetencies parsed={parsed} questionCount={questionCount} />
      </div>

      <div className="btn-wrapper">
        <button onClick={handleStartInterview} className="btn-primary">
          Start interview →
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Suspense fallback={null}>
        <ReviewContent />
      </Suspense>
    </main>
  );
}