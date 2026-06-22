import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useAnalysis } from "@/hooks/use-analysis";
import { useGeneration } from "@/hooks/use-generation";
import { ArticleSelector } from "@/components/studio/ArticleSelector";
import { ArticleReader } from "@/components/studio/ArticleReader";
import { VariantTabs } from "@/components/studio/VariantTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { platformOrder } from "@/lib/constants";
import { Loader2, Wand2, GitMerge, Sparkles, Lightbulb } from "lucide-react";
import { LlmToggle } from "@/components/system/LlmToggle";

export function StudioView() {
  const store = useAppStore();
  const {
    articles,
    selectedArticleIds,
    selectedArticleId,
    activeTopicId,
    getSelectedArticle,
    getActivePost,
    analysisByArticleId,
  } = store;

  const [fusePrompt, setFusePrompt] = useState("");

  const selectedArticle = getSelectedArticle();
  const activePost = getActivePost();
  const usedLlm = activePost
    ? store.usedLlmByPost[activePost.id] ?? activePost.used_llm
    : false;
  const analysis = selectedArticle
    ? analysisByArticleId[selectedArticle.id]
    : undefined;

  const { analyze, analyzing } = useAnalysis();
  const { generate, generating, progress, generateFused, generatingFused, fuseProgress } =
    useGeneration();

  const canFuse = selectedArticleIds.length > 1;

  const handleGenerate = () => {
    if (!selectedArticle?.id) return;
    void generate(selectedArticle.id, platformOrder, activeTopicId);
  };

  const handleGenerateFused = () => {
    if (!canFuse) return;
    void generateFused(
      selectedArticleIds,
      platformOrder,
      activeTopicId,
      fusePrompt || undefined
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">内容工作室</h2>
          <p className="text-xs text-muted-foreground">
            阅读资料、AI 分析并生成多平台文案
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LlmToggle />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => selectedArticle && analyze(selectedArticle.id, activeTopicId)}
            disabled={analyzing || !selectedArticle}
          >
            {analyzing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            AI 分析
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4 lg:overflow-hidden">
        <div className="min-h-[240px] h-[680px] max-h-[75vh] min-w-0 lg:min-h-0">
          <ArticleSelector
            articles={articles}
            selectedArticleIds={selectedArticleIds}
            activeArticleId={selectedArticleId}
          />
        </div>

        <div className="min-h-[360px] h-[680px] max-h-[75vh] min-w-0 lg:col-span-2 lg:min-h-0">
          <ArticleReader
            article={selectedArticle}
            analysis={analysis}
            topicId={activeTopicId}
          />
        </div>

        <div className="flex min-h-[320px] h-[680px] max-h-[75vh] min-w-0 flex-col gap-3 lg:min-h-0">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">生成操作</span>
                {activePost && (
                  <Badge variant="outline" className="text-[10px]">
                    {activePost.source_kind === "fused" ? "融合版本" : "单篇版本"}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating || !selectedArticle}
                  className="w-full"
                >
                  {generating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  单篇生成
                </Button>
                <Button
                  size="sm"
                  variant={canFuse ? "default" : "secondary"}
                  onClick={handleGenerateFused}
                  disabled={generatingFused || !canFuse}
                  className="w-full"
                >
                  {generatingFused ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <GitMerge size={14} />
                  )}
                  融合生成
                </Button>
              </div>

              {!canFuse && (
                <p className="text-[10px] text-muted-foreground">
                  <Lightbulb size={10} className="mr-1 inline" />
                  在左侧资料池打开开关选择 2 篇及以上文章，即可使用融合生成
                </p>
              )}

              {canFuse && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    融合创作意图（可选）
                  </label>
                  <Textarea
                    placeholder="例如：对比这几篇文章，分析事件对普通用户的影响..."
                    value={fusePrompt}
                    onChange={(e) => setFusePrompt(e.target.value)}
                    className="min-h-[60px] resize-none text-xs"
                  />
                </div>
              )}

              {(generating || generatingFused) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{generating ? "生成进度" : "融合进度"}</span>
                    <span>{(generating ? progress : fuseProgress)?.percent ?? 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(generating ? progress : fuseProgress)?.percent ?? 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {(generating ? progress : fuseProgress)?.message || "处理中…"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-1 min-h-0 flex-col">
            <VariantTabs post={activePost} usedLlm={usedLlm} />
          </div>
        </div>
      </div>
    </div>
  );
}
