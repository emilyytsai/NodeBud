"use client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JdTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function JdTextarea({ value, onChange, disabled }: JdTextareaProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="jd-input">Paste the job description</Label>
      <Textarea
        id="jd-input"
        placeholder="Paste the full job description here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[200px] resize-y glass-input"
      />
      <p className="text-xs text-muted-foreground">{value.length} characters</p>
    </div>
  );
}