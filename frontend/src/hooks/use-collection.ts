import { useCallback, useState } from "react";
import { collectRssByTopicAsync, getDashboard, getRankings } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import type { JobProgressData } from "@/types";
import { messageOf } from "@/lib/utils";

export function useCollection() {
  const store = useAppStore();
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState<JobProgressData | undefined>();

  const refreshRankings = useCallback(
    async (topicId: string) => {
      try {
        const result = await getRankings(topicId, 50);
        store.setRankingItems(result.items);
        if (result.items[0]) {
          store.setSelectedArticleId(result.items[0].article.id);
        }
      } catch {
        const filtered = store.articles.filter((article) => article.topic_id === topicId).slice(0, 50);
        store.setRankingItems(
          filtered.map((article, index) => ({
            article: { ...article, rank: index + 1 },
            score: {
              article_id: article.id,
              topic_id: topicId,
              relevance_score: 0,
              recency_score: 0,
              source_weight: 0.5,
              hot_score: article.score ?? 0,
              rank: index + 1,
              reason: "本地兜底排序",
            },
          })),
        );
        if (filtered[0]) store.setSelectedArticleId(filtered[0].id);
      }
    },
    [store],
  );

  const collect = useCallback(
    async (topicId: string, keyword?: string) => {
      if (collecting) return;
      setCollecting(true);
      setProgress(undefined);
      const topicName = store.topics.find((t) => t.id === topicId)?.name ?? "当前话题";
      try {
        const { job_id } = await collectRssByTopicAsync(topicId, keyword, 7, 50);
        // Simple polling fallback since useJobStream is for React lifecycle
        const interval = setInterval(async () => {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/jobs/${job_id}`);
            if (!response.ok) return;
            const data: JobProgressData = await response.json();
            setProgress(data);
            if (["completed", "failed", "cancelled"].includes(data.status)) {
              clearInterval(interval);
              setCollecting(false);
              if (data.status === "completed") {
                const dashboard = await getDashboard();
                store.setDashboard(dashboard);
                await refreshRankings(topicId);
                store.addToast({
                  title: "采集完成",
                  message: `「${topicName}」新稿入池，共 ${dashboard.articles.length} 篇文章`,
                  status: "success",
                });
              } else {
                store.addToast({
                  title: "采集失败",
                  message: data.error || "请检查 RSS 源与网络状态",
                  status: "error",
                });
              }
            }
          } catch {
            // ignore polling errors
          }
        }, 800);
      } catch (error) {
        setCollecting(false);
        store.addToast({
          title: "采集失败",
          message: messageOf(error),
          status: "error",
        });
      }
    },
    [collecting, store, refreshRankings],
  );

  return { collect, collecting, progress, refreshRankings };
}
