import { CheckSquare, Square } from "lucide-react";
import type { ArticleItem } from "../types";

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

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function ArticleRow({
  article,
  score,
  rank,
  selected,
  checked,
  onSelect,
  onToggle,
}: {
  article: ArticleItem;
  score: number;
  rank: number;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const heatPercent = Math.min(100, Math.max(8, score * 100));

  return (
    <article className={selected ? "feedCard selected" : "feedCard"}>
      <div className="feedCardHead">
        <span className="feedSource">{article.source}</span>
        <span className="feedDate">{formatDate(article.published_at)}</span>
        <button className="feedCheck" onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={checked ? "取消选择" : "选择文章"}>
          {checked ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>
      </div>
      <button className="feedCardBody" onClick={onSelect}>
        <h3 className="feedCardTitle">{article.title}</h3>
        <p className="feedCardSummary">{articleExcerpt(article, 120)}</p>
        <div className="heatBar">
          <i className="heatBarFill" style={{ width: `${heatPercent}%` }} />
          <span>{score.toFixed(2)}</span>
        </div>
      </button>
    </article>
  );
}
