import { useAppStore } from "@/store/app-store";
import { useAnalysis } from "@/hooks/use-analysis";
import { useGeneration } from "@/hooks/use-generation";
import { ArticleSelector } from "@/components/studio/ArticleSelector";
import { ArticleReader } from "@/components/studio/ArticleReader";
import { VariantTabs } from "@/components/studio/VariantTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { platformOrder } from "@/lib/constants";
import { Loader2, Wand2, GitMerge } from "lucide-react";
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

  const selectedArticle = getSelectedArticle();
  const activePost = getActivePost();
  const usedLlm = activePost ? store.usedLlmByPost[activePost.id] ?? activePost.used_llm : false;
  const analysis = selectedArticle ? analysisByArticleId[selectedArticle.id] : undefined;

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
    void generateFused(selectedArticleIds, platformOrder, activeTopicId);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">内容工作室</h2>
        <p className="text-xs text-muted-foreground">阅读资料、AI 分析并生成多平台文案</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4 lg:overflow-hidden">
        <div className="min-h-[240px] h-[min(680px,75vh)] lg:min-h-0">
          <ArticleSelector
            articles={articles}
            selectedArticleIds={selectedArticleIds}
            activeArticleId={selectedArticleId}
          />
        </div>

        <div className="min-h-[360px] h-[min(680px,75vh)] lg:col-span-2 lg:min-h-0">
          <ArticleReader
            article={selectedArticle}
            analysis={analysis}
            topicId={activeTopicId}
          />
        </div>

        <div className="flex min-h-[320px] flex-col gap-3 lg:min-h-0">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">生成操作</span>
                <LlmToggle />
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
                  variant="secondary"
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

          <div className="flex-1 min-h-0">
            <VariantTabs post={activePost} usedLlm={usedLlm} />
          </div>
        </div>
      </div>
    </div>
  );
}
