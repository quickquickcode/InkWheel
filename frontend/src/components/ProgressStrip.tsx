import type { JobProgressData } from "../types";

export function ProgressStrip({ progress }: { progress?: JobProgressData }) {
  if (!progress) return null;
  return (
    <div className="progressInk">
      <div>
        <span>{progress.title}</span>
        <strong>{progress.percent}%</strong>
      </div>
      <i style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
      <p>{progress.message}</p>
    </div>
  );
}
