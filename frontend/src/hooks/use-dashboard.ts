import { useCallback, useEffect } from "react";
import { getDashboard } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { messageOf } from "@/lib/utils";

export function useDashboard() {
  const store = useAppStore();

  const load = useCallback(async () => {
    store.setIsLoading(true);
    try {
      const dashboard = await getDashboard();
      store.setDashboard(dashboard);
      const firstTopic = dashboard.topics[0];
      if (firstTopic) {
        store.setActiveTopicId(firstTopic.id);
      }
      if (dashboard.posts[0]) {
        store.setActivePostId(dashboard.posts[0].id);
        store.setPublishPostId(dashboard.posts[0].id);
      }
    } catch (error) {
      store.addToast({
        title: "加载失败",
        message: `无法连接到后端：${messageOf(error)}`,
        status: "error",
      });
    } finally {
      store.setIsLoading(false);
    }
  }, [store]);

  useEffect(() => {
    load();
  }, [load]);

  return { load };
}
