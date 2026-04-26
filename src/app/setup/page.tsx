"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JdTextarea } from "@/components/setup/jd-textarea";
import { PersonaPicker } from "@/components/setup/persona-picker";
import { ParsedCompetencies } from "@/components/setup/parsed-competencies";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";

export default function SetupPage() {
  const [jdText, setJdText] = useState("");
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedJd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canGenerate = jdText.length >= 50 && persona !== null && !loading;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setParsed(data);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = () => {
    const sessionId = `s_${Date.now()}`;
    sessionStorage.setItem(
      `session:${sessionId}:setup`,
      JSON.stringify({ jdText, persona, parsed })
    );
    router.push(`/interview/${sessionId}`);
  };

return (
    <main className="relative min-h-screen overflow-hidden">

      <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-8">
        
        <Link
          href="/"
          className="inline-block text-amber-100 hover:text-white hover:-translate-y-1 transition z-20"
        >
          ← &nbsp;Back
        </Link>

        <div>
          <h1 className="setup-title -mt-5">Set up your interview</h1>
          <p className="mt-2 text-amber-100">
            Paste a job description and pick your interviewer. We&apos;ll tailor the questions to the role.
          </p>
        </div>

        <JdTextarea value={jdText} onChange={setJdText} disabled={loading} />

        <PersonaPicker
          value={persona}
          onChange={setPersona}
          disabled={loading || jdText.length < 50}
        />

        {error && (
          <p className="text-sm text-red-300 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3">
            {error}
          </p>
        )}

        <div className="btn-wrapper">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary disabled:cursor-not-allowed"
          >
            {loading ? "Parsing job description…" : "Generate questions"}
          </button>
        </div>

        {parsed && (
          <div className="space-y-4">
            <ParsedCompetencies parsed={parsed} />
            <div className="btn-wrapper">
              <button onClick={handleStartInterview} className="btn-primary">
                Start interview →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}