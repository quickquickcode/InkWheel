import { useCallback, useState } from "react";
import { analyzeArticle } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { messageOf } from "@/lib/utils";

export function useAnalysis() {
  const store = useAppStore();
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = useCallback(
    async (articleId: string, topicId?: string) => {
      if (analyzing) return;
      setAnalyzing(true);
      try {
        const result = await analyzeArticle(articleId, topicId);
        store.setAnalysis(articleId, result.analysis);
        store.prependJob(result.job);
        store.addToast({
          title: "分析完成",
          message: `《${store.getSelectedArticle()?.title ?? "文章"}》分析完成`,
          status: "success",
        });
      } catch (error) {
        store.addToast({
          title: "分析失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setAnalyzing(false);
      }
    },
    [analyzing, store],
  );

  return { analyze, analyzing };
}
