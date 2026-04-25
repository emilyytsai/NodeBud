"use client";
import { Label } from "@/components/ui/label";
import { PERSONAS, type PersonaId } from "@/lib/personas";

interface PersonaPickerProps {
  value: PersonaId;
  onChange: (value: PersonaId) => void;
  disabled?: boolean;
}

export function PersonaPicker({ value, onChange, disabled }: PersonaPickerProps) {
  return (
    <div className="space-y-2">
      <Label>Interviewer persona</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.values(PERSONAS).map((persona) => (
          <button
            key={persona.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(persona.id as PersonaId)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              value === persona.id
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/50"
            }`}
          >
            <div className="font-medium text-sm">{persona.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{persona.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
