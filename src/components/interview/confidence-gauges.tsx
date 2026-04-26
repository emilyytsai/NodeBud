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
    value >= 70 ? "text-green-400" : value >= 40 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex-1 glass-input rounded-lg border border-white/20 p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}%</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}