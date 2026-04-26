interface ConfidenceGaugesProps {
  posture: number;
  eyeContact: number;
  calibrated?: boolean;
  showOverlay?: boolean;
  onToggleOverlay?: () => void;
}

export function ConfidenceGauges({
  posture,
  eyeContact,
  calibrated = true,
  showOverlay,
  onToggleOverlay,
}: ConfidenceGaugesProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <GaugeCard label="Posture" value={posture} calibrated={calibrated} />
        <GaugeCard label="Eye Contact" value={eyeContact} calibrated={calibrated} />
      </div>
      {onToggleOverlay !== undefined && (
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition select-none">
          <input
            type="checkbox"
            checked={showOverlay ?? false}
            onChange={() => onToggleOverlay()}
            className="accent-cyan-400"
          />
          Show landmarks
        </label>
      )}
    </div>
  );
}

function GaugeCard({
  label,
  value,
  calibrated,
}: {
  label: string;
  value: number;
  calibrated: boolean;
}) {
  const color = !calibrated
    ? "text-gray-400"
    : value >= 70
    ? "text-green-400"
    : value >= 40
    ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="flex-1 glass-input rounded-lg border border-white/20 p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {calibrated ? `${value}%` : "—"}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
