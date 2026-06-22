import { useAppStore } from "@/store/app-store";
import { useCollection } from "@/hooks/use-collection";
import { SourceFilter } from "@/components/trends/SourceFilter";
import { TrendTable } from "@/components/trends/TrendTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Download, Loader2, TrendingUp } from "lucide-react";

export function TrendsView() {
  const store = useAppStore();
  const { topics, rssSources, activeTopicId, rankingItems, isLoading, keyword } = store;
  const { collect, collecting, progress } = useCollection();

  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? topics[0];
  const topicId = activeTopic?.id ?? "";

  const handleCollect = () => {
    if (!topicId) return;
    void collect(topicId, keyword || undefined);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">趋势洞察</h2>
        <p className="text-xs text-muted-foreground">热点采集、源站筛选与榜单排序</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4 lg:overflow-hidden">
        <div className="flex flex-col gap-4 lg:overflow-auto">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">话题选择</span>
              </div>
              {topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无话题配置</p>
              ) : (
                <div className="space-y-1.5">
                  {topics.map((topic) => {
                    const active = topic.id === topicId;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => store.setActiveTopicId(topic.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <span className="truncate">{topic.name}</span>
                        {active && <Badge variant="secondary" className="text-[10px]">当前</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <SourceFilter rssSources={rssSources} />
        </div>

        <div className="flex min-h-[360px] flex-col gap-3 lg:col-span-3 lg:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                {activeTopic ? `${activeTopic.name} 热榜` : "趋势榜单"}
              </h3>
              <p className="text-xs text-muted-foreground">
                共 {rankingItems.length} 条 · 点击行进入内容工作室
              </p>
            </div>
            <Button size="sm" onClick={handleCollect} disabled={collecting || !topicId}>
              {collecting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              采集
            </Button>
          </div>

          {collecting && progress && (
            <Card>
              <CardContent className="space-y-1 p-3">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{progress.title}</span>
                  <span className="text-muted-foreground">{progress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{progress.message}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex-1 min-h-0">
            <TrendTable
              rankingItems={rankingItems}
              isLoading={isLoading && rankingItems.length === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
