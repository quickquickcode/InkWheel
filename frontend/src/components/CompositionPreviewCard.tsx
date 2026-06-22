import { Brush, Copy, Loader2, PenLine, WandSparkles } from "lucide-react";

import type {
  PlatformId,
  ArticleItem,
  PostDraft,
  ContentVariant,
  JobProgressData,
} from "../types";

import { PanelHead } from "./PanelHead";
import { ProgressStrip } from "./ProgressStrip";
import { EmptyState } from "./EmptyState";

const platformLabels: Record<PlatformId, string> = {
  xiaohongshu: "小红书",
  toutiao: "今日头条",
  wechat: "微信公众号",
};

const platformPoems: Record<PlatformId, string> = {
  xiaohongshu: "短图文",
  toutiao: "资讯流",
  wechat: "长文章",
};

export function CompositionPreviewCard({
  post,
  variant,
  activePlatform,
  posts,
  selectedArticles,
  selectedCount,
  generatingFused,
  fuseProgress,
  onPlatform,
  onPostChange,
  onToggleSelected,
  onClearSelection,
  onGenerateFused,
  onCopy,
}: {
  post?: PostDraft;
  variant?: ContentVariant;
  activePlatform: PlatformId;
  posts: PostDraft[];
  selectedArticles: ArticleItem[];
  selectedCount: number;
  generatingFused: boolean;
  fuseProgress?: JobProgressData;
  onPlatform: (platform: PlatformId) => void;
  onPostChange: (postId: string) => void;
  onToggleSelected: (articleId: string) => void;
  onClearSelection: () => void;
  onGenerateFused: () => void;
  onCopy: () => void;
}) {
  return (
    <section className="paperPanel compositionPreview" id="composition-preview">
      <PanelHead title="内容预览" note={post ? `${post.variants.length} 个平台` : "待生成"} icon={<PenLine size={18} />} />
      <div className="platformInkTabs">
        {(Object.keys(platformLabels) as PlatformId[]).map((platform) => (
          <button
            key={platform}
            className={platform === activePlatform ? "active" : ""}
            onClick={() => onPlatform(platform)}
          >
            <span>{platformPoems[platform]}</span>
            <strong>{platformLabels[platform]}</strong>
          </button>
        ))}
      </div>

      {post ? (
        <>
          <label className="postPicker">
            <span>文案</span>
            <select value={post.id} onChange={(event) => onPostChange(event.target.value)}>
              {posts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.source_title} · {new Date(item.created_at).toLocaleString("zh-CN")}
                </option>
              ))}
            </select>
          </label>
          {variant ? (
            <article className="generatedScroll">
              <div className="scrollCover">
                <Brush size={24} />
                <span>PREVIEW</span>
              </div>
              <div className="scrollBody">
                <h3>{variant.title}</h3>
                <pre>{variant.body}</pre>
                <div className="tagCloud">
                  {variant.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                {variant.image_prompt ? <small>配图意向：{variant.image_prompt}</small> : null}
              </div>
            </article>
          ) : (
            <EmptyState title="此平台暂无文案" body="可重新生成三平台版本。" />
          )}
          <button className="inkButton ghost copyButton" onClick={onCopy} disabled={!variant}>
            <Copy size={16} />
            复制本版
          </button>
        </>
      ) : (
        <EmptyState title="暂无生成内容" body="先选择文章并点击「生成内容」，或选多篇融合。" />
      )}

      <div className="fusionWell">
        <div className="fusionHead">
          <strong className="font-bungee">多稿融合</strong>
          <span>{selectedCount} 篇入选</span>
        </div>
        {selectedArticles.length ? (
          <div className="selectedChips">
            {selectedArticles.slice(0, 4).map((article) => (
              <button key={article.id} onClick={() => onToggleSelected(article.id)} title="点击取消选择">
                {article.title}
                <span className="chipClose">×</span>
              </button>
            ))}
            {selectedArticles.length > 4 ? <span>+{selectedArticles.length - 4}</span> : null}
          </div>
        ) : (
          <p>在左侧列表勾选多篇文章，可一键融合生成三平台内容。</p>
        )}
        <div className="fusionActions">
          <button className="inkButton primary" onClick={onGenerateFused} disabled={!selectedCount || generatingFused}>
            {generatingFused ? <Loader2 size={16} className="spin" /> : <WandSparkles size={16} />}
            融合生成
          </button>
          {selectedCount > 0 && (
            <button className="inkButton ghost" onClick={onClearSelection} disabled={generatingFused}>
              清空选择
            </button>
          )}
        </div>
        <ProgressStrip progress={fuseProgress} />
      </div>
    </section>
  );
}
