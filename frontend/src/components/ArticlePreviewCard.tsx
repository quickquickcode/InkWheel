import { BookOpen, ExternalLink, Loader2, Sparkles, WandSparkles } from "lucide-react";
import type { ArticleItem, ArticleAnalysis, JobProgressData } from "../types";
import { PanelHead } from "./PanelHead";
import { ProgressStrip } from "./ProgressStrip";
import { EmptyState } from "./EmptyState";

function formatDate(value?: string | null) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function articleExcerpt(article: ArticleItem, limit: number, fallback = "暂无摘要。") {
  const raw = article.summary || article.content || "";
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return fallback;
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function ArticlePreviewCard({
  article,
  analysis,
  analyzing,
  generating,
  progress,
  onAnalyze,
  onGenerate,
}: {
  article?: ArticleItem;
  analysis?: ArticleAnalysis;
  analyzing: boolean;
  generating: boolean;
  progress?: JobProgressData;
  onAnalyze: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="paperPanel articlePreview" id="article-preview">
      <PanelHead title="文章预览" note={article?.source ?? "待选择"} icon={<BookOpen size={18} />} />
      {article ? (
        <>
          <div className="articleHero">
            <span className="sourceStone">{article.source}</span>
            <h2>{article.title}</h2>
            <p>{articleExcerpt(article, 260, "暂无摘要，建议查看原文。")}</p>
            <dl>
              <div>
                <dt>发布时间</dt>
                <dd>{formatDate(article.published_at)}</dd>
              </div>
              <div>
                <dt>热度</dt>
                <dd>{article.score.toFixed(2)}</dd>
              </div>
              <div>
                <dt>排序</dt>
                <dd>#{article.rank || "-"}</dd>
              </div>
            </dl>
          </div>
          {article.url ? (
            <a className="originLink" href={article.url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              开原文
            </a>
          ) : null}
          <div className="previewActions">
            <button className="inkButton ghost" onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {analyzing ? "分析中" : "AI 分析"}
            </button>
            <button className="inkButton primary" onClick={onGenerate} disabled={generating}>
              {generating ? <Loader2 size={16} className="spin" /> : <WandSparkles size={16} />}
              {generating ? "生成中" : "生成内容"}
            </button>
          </div>
          <ProgressStrip progress={progress} />
          {analysis ? (
            <div className="analysisInk">
              <strong className="font-bungee">AI 洞察</strong>
              <p>{analysis.summary}</p>
              <div className="tagCloud">
                {analysis.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <small>
                受众：{analysis.audience} · 调性：{analysis.tone}
              </small>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title="尚未选择" body="从左侧列表点击选择一篇文章。" />
      )}
    </section>
  );
}
