import { useCallback, useState } from "react";
import { generateContentAsync, generateContentFusedAsync, getDashboard } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import type { JobProgressData, PlatformId } from "@/types";
import { messageOf } from "@/lib/utils";

export function useGeneration() {
  const store = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [generatingFused, setGeneratingFused] = useState(false);
  const [progress, setProgress] = useState<JobProgressData | undefined>();
  const [fuseProgress, setFuseProgress] = useState<JobProgressData | undefined>();

  const pollJob = async (jobId: string, onProgress: (p: JobProgressData) => void) => {
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/jobs/${jobId}`,
          );
          if (!response.ok) return;
          const data: JobProgressData = await response.json();
          onProgress(data);
          if (["completed", "failed", "cancelled"].includes(data.status)) {
            clearInterval(interval);
            if (data.status === "completed") resolve();
            else reject(new Error(data.error || "任务失败"));
          }
        } catch {
          // ignore polling errors
        }
      }, 800);
    });
  };

  const generate = useCallback(
    async (articleId: string, platforms: PlatformId[], topicId?: string) => {
      if (generating) return;
      setGenerating(true);
      setProgress(undefined);
      try {
        const { job_id } = await generateContentAsync({
          articleId,
          platforms,
          useLlm: store.useLlm,
          topicId,
        });
        await pollJob(job_id, setProgress);
        const dashboard = await getDashboard();
        store.setDashboard(dashboard);
        store.setActivePlatform("xiaohongshu");
        store.setActivePostId(dashboard.posts[0]?.id);
        store.addToast({
          title: "生成完成",
          message: `已生成 ${dashboard.posts[0]?.variants.length ?? 0} 个平台版本`,
          status: "success",
        });
      } catch (error) {
        store.addToast({
          title: "生成失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setGenerating(false);
      }
    },
    [generating, store],
  );

  const generateFused = useCallback(
    async (articleIds: string[], platforms: PlatformId[], topicId?: string, userPrompt?: string) => {
      if (generatingFused) return;
      setGeneratingFused(true);
      setFuseProgress(undefined);
      try {
        const { job_id } = await generateContentFusedAsync({
          articleIds,
          platforms,
          useLlm: store.useLlm,
          topicId,
          userPrompt,
        });
        await pollJob(job_id, setFuseProgress);
        const dashboard = await getDashboard();
        store.setDashboard(dashboard);
        store.setActivePlatform("xiaohongshu");
        store.setActivePostId(dashboard.posts[0]?.id);
        store.clearArticleSelection();
        store.addToast({
          title: "融合生成完成",
          message: "已基于多篇资料生成多平台版本",
          status: "success",
        });
      } catch (error) {
        store.addToast({
          title: "融合生成失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setGeneratingFused(false);
      }
    },
    [generatingFused, store],
  );

  return { generate, generating, progress, generateFused, generatingFused, fuseProgress };
}
