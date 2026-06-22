import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/views/DashboardView";
import { TrendsView } from "@/views/TrendsView";
import { StudioView } from "@/views/StudioView";
import { PublishingView } from "@/views/PublishingView";
import { LogsView } from "@/views/LogsView";
import { useAppStore } from "@/store/app-store";
import { useCollection } from "@/hooks/use-collection";
import { getDashboard } from "@/lib/api";
import { messageOf } from "@/lib/utils";

export function App() {
  const store = useAppStore();
  const { currentView } = store;
  const { refreshRankings } = useCollection();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function load() {
      store.setIsLoading(true);
      try {
        const dashboard = await getDashboard();
        store.setDashboard(dashboard);
        store.setActivePostId(dashboard.posts[0]?.id);
        store.setPublishPostId(dashboard.posts[0]?.id);

        const firstTopic = dashboard.topics[0];
        if (firstTopic) {
          store.setActiveTopicId(firstTopic.id);
          await refreshRankings(firstTopic.id);
        }
      } catch (error) {
        store.addToast({
          title: "后端连接失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        store.setIsLoading(false);
      }
    }

    void load();
  }, [store, refreshRankings]);

  return (
    <AppShell>
      {currentView === "dashboard" && <DashboardView />}
      {currentView === "trends" && <TrendsView />}
      {currentView === "studio" && <StudioView />}
      {currentView === "publishing" && <PublishingView />}
      {currentView === "logs" && <LogsView />}
    </AppShell>
  );
}
