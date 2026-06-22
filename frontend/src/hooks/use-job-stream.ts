import { useEffect, useRef } from "react";
import type { JobProgressData } from "@/types";
import { streamJob } from "@/lib/api";

export function useJobStream(
  jobId: string | undefined,
  onProgress: (progress: JobProgressData) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
) {
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!jobId || trackedRef.current.has(jobId)) return;
    trackedRef.current.add(jobId);
    const source = streamJob(
      jobId,
      (progress) => {
        onProgress(progress);
      },
      () => {
        onDone?.();
      },
      (error) => {
        onError?.(error);
      },
    );
    return () => {
      source.close();
    };
  }, [jobId, onProgress, onDone, onError]);
}
