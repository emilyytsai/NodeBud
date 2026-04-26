"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JdTextarea } from "@/components/setup/jd-textarea";
import { PersonaPicker } from "@/components/setup/persona-picker";
import type { PersonaId } from "@/lib/personas";

export default function SetupPage() {
  const [jdText, setJdText] = useState("");
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedJd = sessionStorage.getItem("setup:jdText");
    const savedPersona = sessionStorage.getItem("setup:persona");
    if (savedJd) setJdText(savedJd);
    if (savedPersona) setPersona(savedPersona as PersonaId);
  }, []);


  useEffect(() => {
    sessionStorage.setItem("setup:jdText", jdText);
  }, [jdText]);

  useEffect(() => {
    if (persona) sessionStorage.setItem("setup:persona", persona);
  }, [persona]);

  const canGenerate = jdText.length >= 50 && persona !== null && !loading;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
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
        const sessionId = `s_${Date.now()}`;
        sessionStorage.setItem(
          `session:${sessionId}:setup`,
          JSON.stringify({ jdText, persona, parsed: data })
        );
        router.push(`/setup/review?session=${sessionId}`);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-8">

        <Link
          href="/"
          className="inline-block text-amber-100 hover:text-white hover:-translate-y-1 transition"
        >
          ← &nbsp;Back
        </Link>

        <div>
          <h1 className="setup-title">Set up your interview</h1>
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

      </div>
    </main>
  );
}