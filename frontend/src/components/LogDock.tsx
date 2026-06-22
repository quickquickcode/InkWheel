import { CircleDot } from "lucide-react";
import type { JobEvent } from "../types";
import { PanelHead } from "./PanelHead";

export function LogDock({ jobs }: { jobs: JobEvent[] }) {
  return (
    <section className="paperPanel logDock">
      <PanelHead title="运行日志" note={`${jobs.length} 条`} icon={<CircleDot size={18} />} />
      <ol>
        {jobs.slice(0, 8).map((job) => (
          <li key={job.id}>
            <time>{formatTime(job.created_at)}</time>
            <strong>{job.title}</strong>
            <p>{job.message}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
