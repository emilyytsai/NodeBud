"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JdTextarea } from "@/components/setup/jd-textarea";
import { PersonaPicker } from "@/components/setup/persona-picker";
import { ParsedCompetencies } from "@/components/setup/parsed-competencies";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";

export default function SetupPage() {
  const [jdText, setJdText] = useState("");
  const [persona, setPersona] = useState<PersonaId>("encouraging_recruiter");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedJd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Set up your interview</h1>
        <p className="mt-1 text-muted-foreground">
          Paste a job description and pick your interviewer. We&apos;ll tailor the questions to the role.
        </p>
      </div>

      <JdTextarea value={jdText} onChange={setJdText} disabled={loading} />

      <PersonaPicker value={persona} onChange={setPersona} disabled={loading} />

      {error && (
        <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          {error}
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading || jdText.length < 50}
        className="w-full"
      >
        {loading ? "Parsing job description…" : "Generate questions"}
      </Button>

      {parsed && (
        <div className="space-y-4">
          <ParsedCompetencies parsed={parsed} />
          <Button onClick={handleStartInterview} className="w-full" variant="default">
            Start interview →
          </Button>
        </div>
      )}
    </main>
  );
}
