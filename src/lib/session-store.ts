import type { PersonaId } from "@/lib/personas";

const LS_KEY = "careerprep:sessions";
const MAX = 50;

export type StoredSessionQuestion = {
  question: string;
  overall: number;
  strengths: string[];
  improvements: string[];
};

export type StoredSession = {
  id: string;
  date: string;
  role_title: string;
  persona: PersonaId;
  overall_score: number;
  weak_competencies: string[];
  questions: StoredSessionQuestion[];
};

export function listSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    const next = [session, ...listSessions().filter((s) => s.id !== session.id)].slice(0, MAX);
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // localStorage full or disabled — silently no-op
  }
}

export function getSession(id: string): StoredSession | null {
  return listSessions().find((s) => s.id === id) ?? null;
}
