import type { ArticleItem } from "@/types";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { articleExcerpt, stripHtml } from "@/lib/utils";
import { FileText, Layers, CheckSquare, ChevronDown } from "lucide-react";

interface ArticleSelectorProps {
  articles: ArticleItem[];
  selectedArticleIds: string[];
  activeArticleId?: string;
}

export function ArticleSelector({
  articles,
  selectedArticleIds,
  activeArticleId,
}: ArticleSelectorProps) {
  const { setSelectedArticleId, toggleArticleSelection } = useAppStore();

  return (
    <Card className="grid h-full grid-rows-[auto_1fr] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">资料池</CardTitle>
            <CardDescription>
              共 {articles.length} 篇文章 · 已选 {selectedArticleIds.length} 篇
            </CardDescription>
          </div>
          <Layers size={16} className="text-muted-foreground" />
        </div>
        {selectedArticleIds.length > 1 && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
            <CheckSquare size={12} />
            已选择 {selectedArticleIds.length} 篇文章，可点击“融合生成”
          </div>
        )}
      </CardHeader>
      <CardContent className="overflow-auto pt-0">
        {articles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
            <FileText size={24} className="mb-2 text-muted-foreground/60" />
            暂无文章，请先在趋势洞察页面采集
          </div>
        ) : (
          <div className="space-y-2 pr-3">
            {articles.map((article) => {
              const isSelected = selectedArticleIds.includes(article.id);
              const isActive = activeArticleId === article.id;
              return (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticleId(article.id)}
                  className={`group relative cursor-pointer rounded-lg border p-3 transition-colors ${
                    isActive
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`break-words text-sm font-medium leading-snug ${
                            isActive ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {stripHtml(article.title)}
                        </h4>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {article.source}
                        </Badge>
                        {article.score > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            热度 {Math.round(article.score * 100)}
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="text-[10px]">
                            已选
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {articleExcerpt(stripHtml(article.summary || article.content), 80)}
                      </p>
                    </div>
                    <div
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleArticleSelection(article.id);
                      }}
                      className="shrink-0 pt-0.5"
                    >
                      <Switch
                        checked={isSelected}
                        aria-label={isSelected ? "取消选择" : "选择文章"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {articles.length > 5 && (
              <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <ChevronDown size={12} />
                向下滚动查看其余 {articles.length - 5} 篇文章
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
