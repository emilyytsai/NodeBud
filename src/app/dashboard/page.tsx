"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SessionCard } from "@/components/dashboard/session-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { listSessions, type StoredSession } from "@/lib/session-store";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<StoredSession[] | null>(null);

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  if (sessions === null) {
    return (
      <main className="relative min-h-screen px-4 sm:px-8 pt-24 pb-12 max-w-5xl mx-auto">
        <div className="text-center text-sm text-gray-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 sm:px-8 pt-24 pb-12 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="setup-title">Your Sessions</h1>
        <p className="text-sm text-gray-400 mt-2">
          {sessions.length === 0
            ? "No sessions yet. Run a mock interview to get started."
            : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} saved on this device.`}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-input rounded-2xl border border-white/20 p-10 text-center max-w-md mx-auto space-y-4">
          <p className="text-amber-100">Ready when you are.</p>
          <div className="btn-wrapper inline-block">
            <Link href="/setup" className="btn-primary block text-center">
              Start your first interview
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <TrendChart sessions={sessions} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
