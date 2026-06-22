import { useAppStore } from "@/store/app-store";
import { useCollection } from "@/hooks/use-collection";
import { useAnalysis } from "@/hooks/use-analysis";
import { useGeneration } from "@/hooks/use-generation";
import { WorkflowCards } from "@/components/workflow/WorkflowCards";
import { SourceFilter } from "@/components/trends/SourceFilter";
import { SystemStatus } from "@/components/system/SystemStatus";
import { TrendTable } from "@/components/trends/TrendTable";
import { VariantCard } from "@/components/studio/VariantCard";
import { AdapterCards } from "@/components/publishing/AdapterCards";
import { LogPanel } from "@/components/logs/LogPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { platformOrder } from "@/lib/constants";
import { Loader2, Download, Sparkles, Wand2 } from "lucide-react";

export function DashboardView() {
  const store = useAppStore();
  const {
    topics,
    rankingItems,
    articles,
    posts,
    adapters,
    jobs,
    rssSources,
    activeTopicId,
    selectedArticleId,
    keyword,
    getActivePost,
    isLoading,
  } = store;

  const { collect, collecting } = useCollection();
  const { analyze, analyzing } = useAnalysis();
  const { generate, generating } = useGeneration();

  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? topics[0];
  const topicId = activeTopic?.id ?? "";
  const articleId = selectedArticleId ?? articles[0]?.id;

  const activePost = getActivePost();

  const handleCollect = () => {
    if (!topicId) return;
    void collect(topicId, keyword || undefined);
  };

  const handleAnalyze = () => {
    if (!articleId) return;
    void analyze(articleId, topicId);
  };

  const handleGenerate = () => {
    if (!articleId) return;
    void generate(articleId, platformOrder, topicId);
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">仪表盘</h2>
          <p className="text-xs text-muted-foreground">工作流总览与快捷操作</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCollect}
            disabled={collecting || !topicId}
          >
            {collecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            采集
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAnalyze}
            disabled={analyzing || !articleId}
          >
            {analyzing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            AI 分析
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !articleId}
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wand2 size={14} />
            )}
            生成内容
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Top */}
        <WorkflowCards />
        <div className="col-span-4 flex flex-col gap-4">
          <SourceFilter rssSources={rssSources} />
          <SystemStatus />
        </div>

        {/* Middle */}
        <TrendTable
          rankingItems={rankingItems}
          isLoading={isLoading && rankingItems.length === 0}
        />
        <Card className="col-span-6 flex flex-col">
          <CardContent className="flex-1 space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">内容工作室预览</h3>
                <p className="text-xs text-muted-foreground">
                  {activePost
                    ? `当前草稿：${activePost.source_title}`
                    : "暂无生成内容"}
                </p>
              </div>
            </div>
            {!activePost ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Wand2 size={24} className="mb-2 text-muted-foreground/60" />
                选择文章并点击“生成内容”以创建多平台文案
              </div>
            ) : (
              <div className="grid gap-3">
                {platformOrder.map((platform) => {
                  const variant = activePost.variants.find(
                    (v) => v.platform === platform
                  );
                  if (!variant) return null;
                  return <VariantCard key={platform} variant={variant} />;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom */}
        <AdapterCards adapters={adapters} />
        <LogPanel jobs={jobs} />
      </div>
    </div>
  );
}
