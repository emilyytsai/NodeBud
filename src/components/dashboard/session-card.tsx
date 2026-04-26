"use client";
import { Badge } from "@/components/ui/badge";
import { PERSONAS } from "@/lib/personas";
import type { StoredSession } from "@/lib/session-store";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(value: number): string {
  return value >= 70 ? "text-green-400" : value >= 40 ? "text-amber-400" : "text-red-400";
}

export function SessionCard({ session }: { session: StoredSession }) {
  const persona = PERSONAS[session.persona]?.label ?? session.persona;
  const color = scoreColor(session.overall_score);

  return (
    <div className="glass-input rounded-2xl border border-white/20 p-6 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500">{formatDate(session.date)}</div>
          <h3 className="text-amber-100 text-base font-semibold truncate">
            {session.role_title}
          </h3>
          <div className="text-xs text-gray-400 mt-0.5">{persona}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-3xl font-bold ${color}`}>{session.overall_score}</div>
          <div className="text-[10px] text-gray-500 -mt-1">/ 100</div>
        </div>
      </div>

      {session.weak_competencies.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
            Areas to work on
          </div>
          <div className="flex flex-wrap gap-1.5">
            {session.weak_competencies.slice(0, 5).map((c, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] border-amber-400/40 text-amber-200/90 capitalize"
              >
                {c.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
