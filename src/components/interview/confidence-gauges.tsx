interface ConfidenceGaugesProps {
  posture: number;
  eyeContact: number;
}

export function ConfidenceGauges({ posture, eyeContact }: ConfidenceGaugesProps) {
  return (
    <div className="flex gap-3">
      <GaugeCard label="Posture" value={posture} />
      <GaugeCard label="Eye Contact" value={eyeContact} />
    </div>
  );
}

function GaugeCard({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "text-green-600" : value >= 40 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex-1 rounded-lg border p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}%</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
