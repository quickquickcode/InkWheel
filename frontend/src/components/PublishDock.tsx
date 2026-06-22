import { FileText, Loader2, MonitorUp, Play, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  AdapterPreview,
  AdapterResult,
  AdapterStatus,
  JobProgressData,
  PlatformAccount,
  PlatformId,
  PostDraft,
} from "../types";
import { PanelHead } from "./PanelHead";
import { ProgressStrip } from "./ProgressStrip";
import { EmptyState } from "./EmptyState";

const platformLabels: Record<PlatformId, string> = {
  xiaohongshu: "小红书",
  toutiao: "今日头条",
  wechat: "微信公众号",
};

function stateLabel(state: AdapterStatus["state"]) {
  if (state === "preview_ready") return "预览就绪";
  if (state === "draft_only") return "仅草稿";
  return "未连接";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function PublishDock({
  adapters,
  posts,
  post,
  publishPostId,
  activePlatform,
  toutiaoAccount,
  accountLoading,
  previewing,
  executing,
  publishingToutiao,
  toutiaoProgress,
  lastPreview,
  lastResult,
  onPostChange,
  onPreview,
  onExecutePreview,
  onPublishToutiao,
  onSaveToutiaoAccount,
  onRefreshToutiaoAccount,
  onOpenToutiaoLogin,
  onPlatform,
}: {
  adapters: AdapterStatus[];
  posts: PostDraft[];
  post?: PostDraft;
  publishPostId?: string;
  activePlatform: PlatformId;
  toutiaoAccount?: PlatformAccount;
  accountLoading: boolean;
  previewing?: PlatformId;
  executing?: PlatformId;
  publishingToutiao: boolean;
  toutiaoProgress?: JobProgressData;
  lastPreview?: AdapterPreview;
  lastResult?: AdapterResult;
  onPostChange: (postId: string) => void;
  onPreview: (platform: PlatformId) => void;
  onExecutePreview: (platform: PlatformId) => void;
  onPublishToutiao: (topic?: string) => void;
  onSaveToutiaoAccount: (label: string, cookiePath: string) => void;
  onRefreshToutiaoAccount: () => void;
  onOpenToutiaoLogin: () => void;
  onPlatform: (platform: PlatformId) => void;
}) {
  const activePayload = lastPreview?.platform === activePlatform ? lastPreview : undefined;
  const activeResult = lastResult?.platform === activePlatform ? lastResult : undefined;
  const publishVariant = post?.variants.find((variant) => variant.platform === activePlatform);
  const toutiaoVariant = post?.variants.find((variant) => variant.platform === "toutiao");
  const [draftLabel, setDraftLabel] = useState(toutiaoAccount?.label ?? "默认头条账号");
  const [draftCookiePath, setDraftCookiePath] = useState(toutiaoAccount?.cookie_path ?? "");
  const [topic, setTopic] = useState(toutiaoVariant?.tags.slice(0, 2).join(" ") ?? "");

  useEffect(() => {
    setDraftLabel(toutiaoAccount?.label ?? "默认头条账号");
    setDraftCookiePath(toutiaoAccount?.cookie_path ?? "");
  }, [toutiaoAccount?.label, toutiaoAccount?.cookie_path]);

  useEffect(() => {
    setTopic(toutiaoVariant?.tags.slice(0, 2).join(" ") ?? "");
  }, [toutiaoVariant?.title]);

  return (
    <section className="paperPanel publishDock">
      <PanelHead title="发布管理" note={post ? "选择文案和平台" : "待生成"} icon={<Send size={18} />} />

      {post ? (
        <div className="publishPicker">
          <label>
            <span>待发布文案</span>
            <select aria-label="待发布文案" value={publishPostId ?? post.id} onChange={(event) => onPostChange(event.target.value)}>
              {posts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.source_title} · {new Date(item.created_at).toLocaleString("zh-CN")}
                </option>
              ))}
            </select>
          </label>
          <div className="publishSource">
            <strong>{post.source_title}</strong>
            <small>{post.variants.length} 个平台版本 · {formatTime(post.created_at)}</small>
          </div>
        </div>
      ) : (
        <EmptyState title="暂无可发布内容" body="先在上方选择文章并生成内容。" />
      )}

      <div className="adapterGarden">
        {adapters.map((adapter) => (
          <button
            key={adapter.platform}
            data-testid={`publish-adapter-${adapter.platform}`}
            aria-label={`${adapter.label}：${stateLabel(adapter.state)}，${adapter.account}`}
            className={adapter.platform === activePlatform ? "adapterStone active" : "adapterStone"}
            onClick={() => onPlatform(adapter.platform)}
          >
            <span className={`stateDot ${adapter.state}`} />
            <strong>{adapter.label}</strong>
            <small>{stateLabel(adapter.state)} · {adapter.account}</small>
          </button>
        ))}
      </div>

      {post ? (
        <div className="publishReview">
          <div className="publishVariantPreview">
            <span className="overline">{platformLabels[activePlatform]} 版本</span>
            {publishVariant ? (
              <>
                <h3>{publishVariant.title}</h3>
                <p>{publishVariant.body}</p>
                <div className="tagCloud">
                  {publishVariant.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </>
            ) : (
              <p>这份文案没有该平台版本。</p>
            )}
          </div>

          <div className="publishActions">
            <button className="inkButton ghost" onClick={() => onPreview(activePlatform)} disabled={!post || !publishVariant || previewing === activePlatform}>
              {previewing === activePlatform ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
              生成载荷
            </button>
            {activePlatform === "toutiao" ? (
            <button className="inkButton primary" onClick={() => onPublishToutiao(topic)} disabled={!toutiaoVariant || publishingToutiao}>
                {publishingToutiao ? <Loader2 size={16} className="spin" /> : <MonitorUp size={16} />}
                打开浏览器发微头条
              </button>
            ) : (
              <button className="inkButton primary" onClick={() => onExecutePreview(activePlatform)} disabled={!post || !publishVariant || executing === activePlatform}>
                {executing === activePlatform ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                执行安全预览
              </button>
            )}
          </div>
        </div>
      ) : null}

      {activePlatform === "toutiao" ? (
        <div className="accountPanel">
          <div className="accountHead">
            <strong className="font-bungee">今日头条账号</strong>
            <span className={toutiaoAccount?.status === "connected" ? "accountState connected" : "accountState"}>
              {toutiaoAccount?.status === "connected" ? "已连接" : "未连接"}
            </span>
          </div>
          <div className="accountGrid">
            <label>
              <span>账号名称</span>
              <input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} />
            </label>
            <label>
              <span>Cookie 文件</span>
              <input value={draftCookiePath} onChange={(event) => setDraftCookiePath(event.target.value)} placeholder="external/toutiao/toutiao_cli/toutiao_cookies.json" />
            </label>
            <label>
              <span>微头条话题</span>
              <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="AI教育 智能体" />
            </label>
          </div>
          <p>{toutiaoAccount?.notes || "保存 Cookie 文件后，可检查登录态；发布时会打开可见浏览器，由你在头条页面最终确认。"}</p>
          <div className="publishActions">
            <button className="inkButton ghost" onClick={() => onSaveToutiaoAccount(draftLabel, draftCookiePath)} disabled={accountLoading}>
              保存账号
            </button>
            <button className="inkButton ghost" onClick={onRefreshToutiaoAccount} disabled={accountLoading}>
              {accountLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              检查登录
            </button>
            <button className="inkButton primary" onClick={onOpenToutiaoLogin} disabled={accountLoading}>
              {accountLoading ? <Loader2 size={16} className="spin" /> : <MonitorUp size={16} />}
              打开登录浏览器
            </button>
          </div>
          <ProgressStrip progress={toutiaoProgress} />
        </div>
      ) : null}

      <pre className="payloadInk">
        {activePayload
          ? JSON.stringify({ message: activePayload.message, payload: activePayload.payload }, null, 2)
          : activeResult
            ? JSON.stringify(activeResult, null, 2)
            : "此处展示最近一次平台预览载荷。"}
      </pre>
    </section>
  );
}
