import { useState } from "react";
import type { ArticleAnalysis, ArticleItem } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalysis } from "@/hooks/use-analysis";
import { articleExcerpt, formatDate, platformLabels } from "@/lib/utils";
import { Sparkles, FileText, Lightbulb, Users, Tag, ListOrdered, Fingerprint } from "lucide-react";

interface ArticleReaderProps {
  article?: ArticleItem;
  analysis?: ArticleAnalysis;
  topicId?: string;
}

export function ArticleReader({ article, analysis, topicId }: ArticleReaderProps) {
  const { analyze, analyzing } = useAnalysis();

  const handleAnalyze = () => {
    if (!article?.id) return;
    void analyze(article.id, topicId);
  };

  if (!article) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
          <FileText size={32} className="mb-2 text-muted-foreground/60" />
          从左侧选择一篇文章开始阅读
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-snug">{article.title}</CardTitle>
              <CardDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  {article.source}
                </Badge>
                <span className="text-xs">{formatDate(article.published_at || article.collected_at)}</span>
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <Skeleton className="mr-2 h-3.5 w-3.5 rounded-full" />
              ) : (
                <Sparkles size={14} />
              )}
              AI 分析
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analyzing ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {article.content || article.summary || "暂无正文或摘要"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <CardTitle className="text-base">AI 分析结果</CardTitle>
          </div>
          <CardDescription>
            {analysis ? "基于文章内容的结构化洞察" : "点击上方“AI 分析”按钮生成洞察"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysis ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[70%]" />
              <div className="flex flex-wrap gap-2 pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Fingerprint size={14} className="text-slate-500" />
                  摘要
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.summary}
                </p>
              </div>

              {analysis.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tag size={14} className="text-slate-500" />
                    标签
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users size={14} className="text-slate-500" />
                    目标受众
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.audience}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Fingerprint size={14} className="text-slate-500" />
                    内容调性
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.tone}</p>
                </div>
              </div>

              {analysis.suitable_platforms.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListOrdered size={14} className="text-slate-500" />
                    适合平台
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.suitable_platforms.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platformLabels[platform]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.key_points.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListOrdered size={14} className="text-slate-500" />
                    核心要点
                  </div>
                  <ul className="space-y-1">
                    {analysis.key_points.map((point, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="shrink-0 text-xs text-slate-400">{index + 1}.</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
