import { useState } from "react";
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
import { LlmToggle } from "@/components/system/LlmToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { platformOrder } from "@/lib/constants";
import { platformLabels, platformIcons, stripHtml } from "@/lib/utils";
import { Loader2, Download, Sparkles, Wand2 } from "lucide-react";
import type { PlatformId } from "@/types";

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

  const [previewPlatform, setPreviewPlatform] = useState<PlatformId>("xiaohongshu");

  const { collect, collecting } = useCollection();
  const { analyze, analyzing } = useAnalysis();
  const { generate, generating } = useGeneration();

  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? topics[0];
  const topicId = activeTopic?.id ?? "";
  const articleId = selectedArticleId ?? articles[0]?.id;

  const activePost = getActivePost();
  const usedLlm = activePost
    ? store.usedLlmByPost[activePost.id] ?? activePost.used_llm
    : false;

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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">仪表盘</h2>
          <span className="text-xs text-muted-foreground">工作流总览</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LlmToggle />
          <Button
            size="sm"
            onClick={handleCollect}
            disabled={collecting || !topicId}
          >
            {collecting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
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
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            AI 分析
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !articleId}
          >
            {generating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wand2 size={13} />
            )}
            生成
          </Button>
        </div>
      </div>

      {/* Workflow steps */}
      <WorkflowCards />

      {/* Main content + sidebar */}
      <div className="grid grid-cols-12 gap-3">
        {/* Main: trends + preview */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 grid grid-cols-12 gap-3">
          <div className="col-span-12 xl:col-span-7 h-[520px] max-h-[65vh]">
            <TrendTable
              rankingItems={rankingItems}
              isLoading={isLoading && rankingItems.length === 0}
            />
          </div>
          <div className="col-span-12 xl:col-span-5 h-[520px] max-h-[65vh]">
            <Card className="h-full overflow-hidden">
              <CardContent className="flex h-full flex-col p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">内容预览</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {activePost ? stripHtml(activePost.source_title) : "暂无生成内容"}
                    </p>
                  </div>
                </div>
                {!activePost ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    <Wand2 size={20} className="mb-1 text-muted-foreground/60" />
                    选择文章并点击“生成”
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-2 min-h-0">
                    <Tabs
                      value={previewPlatform}
                      onValueChange={(v) => setPreviewPlatform(v as PlatformId)}
                    >
                      <TabsList className="grid h-7 w-full grid-cols-3">
                        {platformOrder.map((platform) => (
                          <TabsTrigger
                            key={platform}
                            value={platform}
                            className="text-[10px]"
                          >
                            <span className="mr-1">{platformIcons[platform]}</span>
                            {platformLabels[platform]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {platformOrder.map((platform) => {
                        const variant = activePost.variants.find(
                          (v) => v.platform === platform
                        );
                        return (
                          <TabsContent
                            key={platform}
                            value={platform}
                            className="mt-2 h-full flex flex-col overflow-hidden"
                          >
                            {variant ? (
                              <VariantCard variant={variant} usedLlm={usedLlm} />
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                暂无该平台版本
                              </div>
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar: status + sources */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          <SystemStatus />
          <SourceFilter rssSources={rssSources} />
        </div>
      </div>

      {/* Bottom: adapters + logs */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-8">
          <AdapterCards adapters={adapters} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LogPanel jobs={jobs} limit={6} />
        </div>
      </div>
    </div>
  );
}
