"use client";
import { Label } from "@/components/ui/label";
import { PERSONAS, type PersonaId } from "@/lib/personas";

interface PersonaPickerProps {
  value: PersonaId | null;
  onChange: (value: PersonaId) => void;
  disabled?: boolean;
}

export function PersonaPicker({ value, onChange, disabled }: PersonaPickerProps) {
  return (
    <div className="space-y-2">
      <Label className={disabled ? "opacity-40" : ""}>Interviewer persona</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.values(PERSONAS).map((persona) => (
          <button
            key={persona.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(persona.id as PersonaId)}
            className={`glass-input rounded-lg border p-4 text-left transition-all duration-200 ${
              value === persona.id
                ? "border-white/70 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                : "border-border"
            } ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "hover:-translate-y-1 hover:border-foreground/50"}`}
          >
            <div className={`font-medium text-sm ${value === persona.id ? "text-amber-100" : ""}`}>
              {persona.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{persona.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}