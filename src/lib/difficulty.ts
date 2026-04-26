export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "Easy",
    description: "Foundational behavioral and intro-level technical questions.",
    promptClause:
      "Difficulty: easy. Favor foundational behavioral questions and entry-level technical fundamentals. Avoid system design, edge cases, or multi-part questions.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "Balanced mix of behavioral and applied technical questions.",
    promptClause:
      "Difficulty: medium. Mix behavioral and applied technical questions appropriate to the role's seniority. Expect concrete examples and reasonable depth.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    description: "Deep technical, system design, and edge-case follow-ups.",
    promptClause:
      "Difficulty: hard. Push for technical depth, system design tradeoffs, and edge cases. Expect the candidate to justify decisions and handle follow-up scrutiny.",
  },
} as const;

export type DifficultyId = keyof typeof DIFFICULTIES;

export const DEFAULT_DIFFICULTY: DifficultyId = "medium";
