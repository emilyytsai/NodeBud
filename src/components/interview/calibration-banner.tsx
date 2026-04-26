import type { CalibrationStatus } from "@/lib/scoring/calibration";

const MESSAGES: Record<Exclude<CalibrationStatus, "ok">, string> = {
  no_detection: "Move into frame so we can track your posture",
  missing_shoulders: "Move back so both shoulders are visible",
  missing_face: "Make sure your face is in the camera frame",
};

interface CalibrationBannerProps {
  status: CalibrationStatus;
}

export function CalibrationBanner({ status }: CalibrationBannerProps) {
  if (status === "ok") return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/20 border border-yellow-400/40 px-3 py-2 text-sm text-yellow-300">
      <span>⚠</span>
      <span>{MESSAGES[status]}</span>
    </div>
  );
}
