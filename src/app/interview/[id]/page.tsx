"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { ParsedJd } from "@/lib/schemas/parsed-jd";
import type { PersonaId } from "@/lib/personas";
import { PERSONAS } from "@/lib/personas";

type SetupPayload = {
  jdText: string;
  persona: PersonaId;
  parsed: ParsedJd | null;
};

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const [setup, setSetup] = useState<SetupPayload | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`session:${sessionId}:setup`);
    if (saved) setSetup(JSON.parse(saved));
  }, [sessionId]);

  const persona = setup ? PERSONAS[setup.persona] : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Interview Room</h1>

      {setup ? (
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {setup.parsed?.role_title ?? "Software Engineer"} ·{" "}
            {setup.parsed?.seniority ?? "junior"}
          </p>
          <p className="text-sm text-muted-foreground">
            Interviewer: {persona?.label ?? setup.persona}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">Loading session…</p>
      )}

      <p className="text-sm text-muted-foreground rounded-md border px-4 py-2">
        CV + voice coming in Phase 2–3
      </p>

      <Link href="/setup" className="text-sm underline text-muted-foreground">
        ← Back to setup
      </Link>
    </main>
  );
}
