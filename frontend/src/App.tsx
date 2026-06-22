import { ChevronLeft, ChevronRight, FileText, Flame, Loader2, Search, Send, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeArticle,
  checkToutiaoAccount,
  clearPersistedContent,
  collectRssByTopicAsync,
  executePreview,
  generateContentAsync,
  generateContentFusedAsync,
  getArticle,
  getDashboard,
  getRankings,
  loginToutiaoAccount,
  previewPublish,
  publishToutiaoMicro,
  streamJob,
  updateToutiaoAccount,
} from "./lib/api";
import type {
  AdapterPreview,
  AdapterResult,
  AdapterStatus,
  ArticleAnalysis,
  ArticleItem,
  ContentVariant,
  JobEvent,
  JobProgressData,
  PlatformAccount,
  PlatformId,
  PostDraft,
  RankingItem,
  TopicConfig,
} from "./types";
import { InkSidebar } from "./components/InkSidebar";
import { HeroSection } from "./components/HeroSection";
import { TopicBand } from "./components/TopicBand";
import { PanelHead } from "./components/PanelHead";
import { ArticleRow } from "./components/ArticleRow";
import { ArticlePreviewCard } from "./components/ArticlePreviewCard";
import { CompositionPreviewCard } from "./components/CompositionPreviewCard";
import { PublishDock } from "./components/PublishDock";
import { ProgressStrip } from "./components/ProgressStrip";
import { EmptyState } from "./components/EmptyState";

type StageId = "gather" | "read" | "compose" | "publish";

export function App() {
  const [topics, setTopics] = useState<TopicConfig[]>([]);
  const [activeTopicId, setActiveTopicId] = useState("");
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | undefined>();
  const [analysis, setAnalysis] = useState<ArticleAnalysis | undefined>();
  const [posts, setPosts] = useState<PostDraft[]>([]);
  const [activePostId, setActivePostId] = useState<string | undefined>();
  const [publishPostId, setPublishPostId] = useState<string | undefined>();
  const [activePlatform, setActivePlatform] = useState<PlatformId>("xiaohongshu");
  const [adapters, setAdapters] = useState<AdapterStatus[]>([]);
  const [toutiaoAccount, setToutiaoAccount] = useState<PlatformAccount | undefined>();
  const [jobs, setJobs] = useState<JobEvent[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [useLlm, setUseLlm] = useState(false);
  const [contentTab, setContentTab] = useState<"preview" | "generate" | "publish">("preview");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState<JobProgressData | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<JobProgressData | undefined>();
  const [generatingFused, setGeneratingFused] = useState(false);
  const [fuseGenerateProgress, setFuseGenerateProgress] = useState<JobProgressData | undefined>();
  const [toutiaoPublishProgress, setToutiaoPublishProgress] = useState<JobProgressData | undefined>();
  const [previewing, setPreviewing] = useState<PlatformId | undefined>();
  const [executing, setExecuting] = useState<PlatformId | undefined>();
  const [publishingToutiao, setPublishingToutiao] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [clearingContent, setClearingContent] = useState(false);
  const [lastPreview, setLastPreview] = useState<AdapterPreview | undefined>();
  const [lastResult, setLastResult] = useState<AdapterResult | undefined>();
  const [toast, setToast] = useState<string | undefined>();

  const activeTopicIdRef = useRef("");
  const rankingRequestRef = useRef(0);
  const initialTopicLoaded = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    getDashboard()
      .then((dashboard) => {
        setTopics(dashboard.topics);
        setArticles(dashboard.articles);
        setPosts(dashboard.posts);
        setAdapters(dashboard.adapters);
        setToutiaoAccount(dashboard.accounts?.find((account) => account.platform === "toutiao"));
        setJobs(dashboard.jobs);
        setActivePostId(dashboard.posts[0]?.id);
        setPublishPostId(dashboard.posts[0]?.id);

        const firstTopic = dashboard.topics[0];
        if (firstTopic) {
          activeTopicIdRef.current = firstTopic.id;
          setActiveTopicId(firstTopic.id);
          refreshRankings(firstTopic.id, dashboard.articles, { selectFirst: true });
        } else if (dashboard.articles[0]) {
          setSelectedArticle(dashboard.articles[0]);
        }
      })
      .catch((error) => {
        setToast(`后端连接失败：${messageOf(error)}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeTopicId) return;
    activeTopicIdRef.current = activeTopicId;
    setAnalysis(undefined);
    if (!initialTopicLoaded.current) {
      initialTopicLoaded.current = true;
      return;
    }
    refreshRankings(activeTopicId, articles, { selectFirst: true });
  }, [activeTopicId]);

  const activeTopic = topics.find((topic) => topic.id === activeTopicId);
  const activePost = posts.find((post) => post.id === activePostId) ?? posts[0];
  const publishPost = posts.find((post) => post.id === publishPostId) ?? posts[0];
  const activeVariant = activePost?.variants.find((variant) => variant.platform === activePlatform);
  const selectedArticleIdsSet = useMemo(() => new Set(selectedArticleIds), [selectedArticleIds]);

  const displayedRankings = useMemo(() => {
    const items = keyword.trim()
      ? rankingItems.filter(({ article }) => {
          const lower = keyword.trim().toLowerCase();
          return (
            article.title.toLowerCase().includes(lower) ||
            (article.summary ?? "").toLowerCase().includes(lower) ||
            article.source.toLowerCase().includes(lower)
          );
        })
      : rankingItems;
    return items.slice(0, 36);
  }, [rankingItems, keyword]);

  const visibleArticlePool = useMemo(() => {
    const map = new Map<string, ArticleItem>();
    rankingItems.forEach(({ article }) => map.set(article.id, article));
    articles.forEach((article) => {
      if (!map.has(article.id)) map.set(article.id, article);
    });
    return Array.from(map.values());
  }, [articles, rankingItems]);

  const selectedArticles = useMemo(
    () => visibleArticlePool.filter((article) => selectedArticleIdsSet.has(article.id)),
    [selectedArticleIdsSet, visibleArticlePool],
  );

  const activeStage: StageId = activePost
    ? "publish"
    : generateProgress || generating || selectedArticleIds.length > 1
      ? "compose"
      : selectedArticle
        ? "read"
        : "gather";

  async function refreshRankings(
    topicId: string,
    sourceArticles: ArticleItem[],
    options: { limit?: number; selectFirst?: boolean } = {},
  ) {
    const requestId = ++rankingRequestRef.current;
    const { limit = 20, selectFirst = false } = options;
    try {
      const result = await getRankings(topicId, limit);
      if (activeTopicIdRef.current !== topicId || rankingRequestRef.current !== requestId) return;
      setRankingItems(result.items);
      if (result.items.length > 0 && (selectFirst || !selectedArticle)) {
        setSelectedArticle(result.items[0].article);
      }
    } catch {
      if (activeTopicIdRef.current !== topicId || rankingRequestRef.current !== requestId) return;
      const filtered = sourceArticles.filter((article) => article.topic_id === topicId).slice(0, limit);
      setRankingItems(
        filtered.map((article, index) => ({
          article: { ...article, rank: index + 1 },
          score: {
            article_id: article.id,
            topic_id: topicId,
            relevance_score: 0,
            recency_score: 0,
            source_weight: 0.5,
            hot_score: article.score ?? 0,
            rank: index + 1,
            reason: "本地兜底排序",
          },
        })),
      );
      if (filtered[0]) setSelectedArticle(filtered[0]);
    }
  }

  async function reloadDashboard(nextPostId?: string) {
    const dashboard = await getDashboard();
    setArticles(dashboard.articles);
    setPosts(dashboard.posts);
    setAdapters(dashboard.adapters);
    setToutiaoAccount(dashboard.accounts?.find((account) => account.platform === "toutiao"));
    setJobs(dashboard.jobs);
    setActivePostId(nextPostId ?? dashboard.posts[0]?.id);
    setPublishPostId((current) => (dashboard.posts.some((post) => post.id === current) ? current : dashboard.posts[0]?.id));
    return dashboard;
  }

  async function refreshToutiaoAccount() {
    setAccountLoading(true);
    setToast(undefined);
    try {
      const result = await checkToutiaoAccount();
      setToutiaoAccount(result.account);
      setAdapters((current) => current.map((adapter) => (adapter.platform === "toutiao" ? result.adapter : adapter)));
      setToast(`今日头条账号状态：${result.account.status === "connected" ? "已连接" : "未连接"}`);
    } catch (error) {
      setToast(`账号检查失败：${messageOf(error)}`);
    } finally {
      setAccountLoading(false);
    }
  }

  async function saveToutiaoAccount(label: string, cookiePath: string) {
    setAccountLoading(true);
    setToast(undefined);
    try {
      const result = await updateToutiaoAccount({ label, cookiePath });
      setToutiaoAccount(result.account);
      setAdapters((current) => current.map((adapter) => (adapter.platform === "toutiao" ? result.adapter : adapter)));
      setToast("今日头条账号配置已保存");
    } catch (error) {
      setToast(`账号保存失败：${messageOf(error)}`);
    } finally {
      setAccountLoading(false);
    }
  }

  async function openToutiaoLogin() {
    setAccountLoading(true);
    setToast(undefined);
    try {
      const result = await loginToutiaoAccount();
      streamJob(
        result.job_id,
        setToutiaoPublishProgress,
        async () => {
          setAccountLoading(false);
          await refreshToutiaoAccount();
        },
        (error) => {
          setAccountLoading(false);
          setToast(`登录流程失败：${error.message}`);
        },
      );
      setToast("已打开今日头条登录浏览器，请在浏览器里完成登录");
    } catch (error) {
      setAccountLoading(false);
      setToast(`无法打开登录浏览器：${messageOf(error)}`);
    }
  }

  async function handleClearContent() {
    if (clearingContent) return;
    if (!window.confirm("确认清空当前已爬取文章、生成稿和运行记录吗？这不会删除主题与账号配置。")) {
      return;
    }
    setClearingContent(true);
    setToast(undefined);
    try {
      const result = await clearPersistedContent();
      setArticles([]);
      setPosts([]);
      setRankingItems([]);
      setSelectedArticle(undefined);
      setAnalysis(undefined);
      setSelectedArticleIds([]);
      setPublishPostId(undefined);
      setActivePostId(undefined);
      await reloadDashboard();
      const clearedText = Object.entries(result.cleared)
        .map(([key, value]) => `${key} ${value}`)
        .join("，");
      setToast(`已清空持久化内容：${clearedText}`);
    } catch (error) {
      setToast(`清空失败：${messageOf(error)}`);
    } finally {
      setClearingContent(false);
    }
  }

  async function handleTopicChange(topicId: string) {
    activeTopicIdRef.current = topicId;
    setActiveTopicId(topicId);
    setSelectedArticleIds([]);
    setKeyword("");
  }

  async function handleSelectArticle(article: ArticleItem) {
    setSelectedArticle(article);
    setAnalysis(undefined);
    try {
      const full = await getArticle(article.id);
      setSelectedArticle(full);
    } catch {
      // 列表数据仍可用于预览，全文加载失败时保持当前选择。
    }
  }

  function toggleArticleSelection(articleId: string) {
    setSelectedArticleIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }

  function pushClientJob(title: string, message: string, status: JobEvent["status"] = "info") {
    setJobs((current) => [
      {
        id: `client_${Date.now()}`,
        kind: "system",
        title,
        message,
        status,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  async function handleCollectByTopic() {
    if (!activeTopicId || collecting) return;
    const topicId = activeTopicId;
    const topicName = topics.find((topic) => topic.id === topicId)?.name ?? "当前题";
    setCollecting(true);
    setCollectProgress(undefined);
    setToast(undefined);
    try {
      const { job_id } = await collectRssByTopicAsync(topicId, keyword.trim() || undefined, 7, 50);
      streamJob(
        job_id,
        setCollectProgress,
        async () => {
          setCollecting(false);
          try {
            const dashboard = await reloadDashboard(activePostId);
            if (activeTopicIdRef.current === topicId) {
              await refreshRankings(topicId, dashboard.articles, { limit: 50, selectFirst: true });
              setToast(`「${topicName}」新稿入池，共 ${dashboard.articles.length} 篇`);
            }
          } catch (error) {
            setToast(`采集结果刷新失败：${messageOf(error)}`);
          }
        },
        (error) => {
          setCollecting(false);
          setToast(error.message);
          pushClientJob("采集失败", "请检查 RSS 源与网络状态。", "error");
        },
      );
    } catch (error) {
      setCollecting(false);
      setToast(`采集失败：${messageOf(error)}`);
      pushClientJob("采集失败", "请检查 RSS 源与网络状态。", "error");
    }
  }

  async function handleAnalyze() {
    if (!selectedArticle || analyzing) return;
    setAnalyzing(true);
    setToast(undefined);
    try {
      const result = await analyzeArticle(selectedArticle.id, activeTopicId);
      setAnalysis(result.analysis);
      setJobs((current) => [result.job, ...current]);
      setToast("文章分析完成");
    } catch (error) {
      setToast(`分析失败：${messageOf(error)}`);
      pushClientJob("AI 分析失败", "LLM 不可用或请求失败。", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate() {
    if (!selectedArticle || generating) return;
    setGenerating(true);
    setGenerateProgress(undefined);
    setToast(undefined);
    try {
      const { job_id } = await generateContentAsync({
        articleId: selectedArticle.id,
        platforms: ["xiaohongshu", "toutiao", "wechat"],
        useLlm,
        topicId: activeTopicId,
      });
      streamJob(
        job_id,
        setGenerateProgress,
        async () => {
          setGenerating(false);
          try {
            const dashboard = await reloadDashboard();
            setActivePlatform("xiaohongshu");
            setToast(`已生成 ${dashboard.posts[0]?.variants.length ?? 0} 个版本`);
          } catch (error) {
            setToast(`生成结果刷新失败：${messageOf(error)}`);
          }
        },
        (error) => {
          setGenerating(false);
          setToast(error.message);
          pushClientJob("内容生成失败", "来源存在但内容服务没有返回可用版本。", "error");
        },
      );
    } catch (error) {
      setGenerating(false);
      setToast(`生成失败：${messageOf(error)}`);
      pushClientJob("内容生成失败", "来源存在但内容服务没有返回可用版本。", "error");
    }
  }

  async function handleGenerateFused() {
    if (selectedArticleIds.length === 0 || generatingFused) return;
    setGeneratingFused(true);
    setFuseGenerateProgress(undefined);
    setToast(undefined);
    try {
      const { job_id } = await generateContentFusedAsync({
        articleIds: selectedArticleIds,
        platforms: ["xiaohongshu", "toutiao", "wechat"],
        useLlm,
        topicId: activeTopicId,
        userPrompt: "",
      });
      streamJob(
        job_id,
        setFuseGenerateProgress,
        async () => {
          setGeneratingFused(false);
          try {
            await reloadDashboard();
            setActivePlatform("xiaohongshu");
            setToast("多稿融合完成");
          } catch (error) {
            setToast(`融合结果刷新失败：${messageOf(error)}`);
          }
        },
        (error) => {
          setGeneratingFused(false);
          setToast(error.message);
          pushClientJob("融合生成失败", "请检查已选资料与 LLM 状态。", "error");
        },
      );
    } catch (error) {
      setGeneratingFused(false);
      setToast(`融合生成失败：${messageOf(error)}`);
      pushClientJob("融合生成失败", "请检查已选资料与 LLM 状态。", "error");
    }
  }

  async function handlePreview(platform: PlatformId) {
    if (!publishPost || previewing) return;
    setPreviewing(platform);
    setToast(undefined);
    try {
      const result = await previewPublish(publishPost.id, platform);
      setLastPreview(result.preview);
      setLastResult(undefined);
      setAdapters(result.adapters);
      setJobs((current) => [result.job, ...current]);
      setToast(`${platformLabels[platform]} 预览载荷已生成`);
    } catch (error) {
      setToast(`预览失败：${messageOf(error)}`);
      pushClientJob("发布预览失败", `${platformLabels[platform]} 适配器没有返回预览。`, "error");
    } finally {
      setPreviewing(undefined);
    }
  }

  async function handleExecutePreview(platform: PlatformId) {
    if (!publishPost || executing) return;
    if (!window.confirm(`确定执行 ${platformLabels[platform]} 的真实外部工具预览吗？\n\n这可能会打开浏览器或创建草稿，但不会自动点击发布。`)) {
      return;
    }
    setExecuting(platform);
    setToast(undefined);
    try {
      const result = await executePreview(publishPost.id, platform, false);
      setLastResult(result.result);
      setLastPreview(undefined);
      setAdapters(result.adapters);
      setJobs((current) => [result.job, ...current]);
      setToast(`${platformLabels[platform]} 外部工具执行完成`);
    } catch (error) {
      setToast(`执行失败：${messageOf(error)}`);
      pushClientJob("外部工具执行失败", `${platformLabels[platform]} 没有返回可用结果。`, "error");
    } finally {
      setExecuting(undefined);
    }
  }

  async function handlePublishToutiao(topic?: string) {
    if (!publishPost || publishingToutiao) return;
    const variant = publishPost.variants.find((item) => item.platform === "toutiao");
    if (!variant) {
      setToast("当前文案没有头条版本，请重新生成三平台内容。");
      return;
    }
    if (!window.confirm(`将打开可见浏览器并填入「${variant.title}」的微头条内容。\n\n最终是否发布由你在今日头条页面手动点击确认。`)) {
      return;
    }
    setPublishingToutiao(true);
    setToutiaoPublishProgress(undefined);
    setToast(undefined);
    try {
      const result = await publishToutiaoMicro(publishPost.id, topic);
      streamJob(
        result.job_id,
        setToutiaoPublishProgress,
        async () => {
          setPublishingToutiao(false);
          await reloadDashboard(publishPost.id);
          setToast("今日头条浏览器已打开，内容已准备，请在页面内检查并发布");
        },
        (error) => {
          setPublishingToutiao(false);
          setToast(`微头条准备失败：${error.message}`);
        },
      );
      setToast("正在打开今日头条微头条发布浏览器");
    } catch (error) {
      setPublishingToutiao(false);
      setToast(`微头条准备失败：${messageOf(error)}`);
    }
  }

  function copyVariant() {
    if (!activeVariant) return;
    const text = `${activeVariant.title}\n\n${activeVariant.body}\n\n${activeVariant.tags.map((tag) => `#${tag}`).join(" ")}`;
    navigator.clipboard?.writeText(text);
    setToast("已复制到剪贴板");
  }

  const platformLabels: Record<PlatformId, string> = {
    xiaohongshu: "小红书",
    toutiao: "今日头条",
    wechat: "微信公众号",
  };

  return (
    <div className="inkApp">
      <InkSidebar
        activeStage={activeStage}
        onStageClick={(stageId) => {
          if (stageId === "gather") setContentTab("preview");
          if (stageId === "read") setContentTab("preview");
          if (stageId === "compose") setContentTab("generate");
          if (stageId === "publish") setContentTab("publish");
        }}
        mobileRailOpen={mobileRailOpen}
        onMobileRailOpen={() => setMobileRailOpen(true)}
        onMobileRailClose={() => setMobileRailOpen(false)}
      />

      <main className="inkWorkspace">
        <HeroSection
          activeTopic={activeTopic}
          collecting={collecting}
          clearingContent={clearingContent}
          useLlm={useLlm}
          onCollect={handleCollectByTopic}
          onClear={handleClearContent}
          onLlmToggle={() => setUseLlm((current) => !current)}
        />

        <TopicBand
          topics={topics}
          activeTopicId={activeTopicId}
          onTopicChange={handleTopicChange}
        />

        <div className={listCollapsed ? "mainStage listCollapsed" : "mainStage"}>
          {/* ─── Left: Article selection (collapsible) ─── */}
          <section className={listCollapsed ? "articleQueue collapsed" : "articleQueue"} id="article-queue">
            <button
              className="listToggle"
              onClick={() => setListCollapsed((c) => !c)}
              aria-label={listCollapsed ? "展开列表" : "收起列表"}
            >
              {listCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            {listCollapsed && (
              <span className="collapsedLabel">文章 {displayedRankings.length}</span>
            )}
            <PanelHead
              title={activeTopic ? `${activeTopic.name} 热榜` : "热榜"}
              note={`${displayedRankings.length} 篇`}
              icon={<Flame size={18} />}
            />
            <label className="inkSearch">
              <Search size={15} />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜标题、来源、摘要" />
            </label>
            <ProgressStrip progress={collectProgress} />
            <div className="articleScroll">
              {displayedRankings.length > 0 ? (
                displayedRankings.map(({ article, score }, index) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    score={score.hot_score}
                    rank={score.rank || article.rank || index + 1}
                    selected={selectedArticle?.id === article.id}
                    checked={selectedArticleIdsSet.has(article.id)}
                    onSelect={() => handleSelectArticle(article)}
                    onToggle={() => toggleArticleSelection(article.id)}
                  />
                ))
              ) : (
                <EmptyState title="暂无文章" body="点击「刷新」获取最新文章。" />
              )}
            </div>
            {jobs.length > 0 ? (
              <div className="logStrip">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="logStripItem">
                    <time>{new Date(job.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</time>
                    <strong>{job.title}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* ─── Right: Tabbed content panel ─── */}
          <div className="contentArea">
            <nav className="contentTabs">
              <button className={contentTab === "preview" ? "contentTab active" : "contentTab"} onClick={() => setContentTab("preview")}>
                <FileText size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                文章分析
              </button>
              <button className={contentTab === "generate" ? "contentTab active" : "contentTab"} onClick={() => setContentTab("generate")}>
                <WandSparkles size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                内容生成
              </button>
              <button className={contentTab === "publish" ? "contentTab active" : "contentTab"} onClick={() => setContentTab("publish")}>
                <Send size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                发布管理
              </button>
            </nav>
            <div className="contentBody">
              {contentTab === "preview" ? (
                <ArticlePreviewCard
                  article={selectedArticle}
                  analysis={analysis}
                  analyzing={analyzing}
                  generating={generating}
                  progress={generateProgress}
                  onAnalyze={handleAnalyze}
                  onGenerate={() => { handleGenerate(); setContentTab("generate"); }}
                />
              ) : null}
              {contentTab === "generate" ? (
                <CompositionPreviewCard
                  post={activePost}
                  variant={activeVariant}
                  activePlatform={activePlatform}
                  posts={posts}
                  selectedArticles={selectedArticles}
                  selectedCount={selectedArticleIds.length}
                  generatingFused={generatingFused}
                  fuseProgress={fuseGenerateProgress}
                  onPlatform={setActivePlatform}
                  onPostChange={setActivePostId}
                  onToggleSelected={(id) => toggleArticleSelection(id)}
                  onClearSelection={() => setSelectedArticleIds([])}
                  onGenerateFused={handleGenerateFused}
                  onCopy={copyVariant}
                />
              ) : null}
              {contentTab === "publish" ? (
                <PublishDock
                  adapters={adapters}
                  posts={posts}
                  post={publishPost}
                  publishPostId={publishPostId}
                  activePlatform={activePlatform}
                  toutiaoAccount={toutiaoAccount}
                  accountLoading={accountLoading}
                  previewing={previewing}
                  executing={executing}
                  publishingToutiao={publishingToutiao}
                  toutiaoProgress={toutiaoPublishProgress}
                  lastPreview={lastPreview}
                  lastResult={lastResult}
                  onPostChange={setPublishPostId}
                  onPreview={handlePreview}
                  onExecutePreview={handleExecutePreview}
                  onPublishToutiao={handlePublishToutiao}
                  onSaveToutiaoAccount={saveToutiaoAccount}
                  onRefreshToutiaoAccount={refreshToutiaoAccount}
                  onOpenToutiaoLogin={openToutiaoLogin}
                  onPlatform={setActivePlatform}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {loading ? (
        <div className="inkLoading">
          <Loader2 size={32} className="loadingSpinner spin" />
          <span>加载中</span>
        </div>
      ) : null}

      {toast ? (
        <div className="inkToast" role="alert">
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast(undefined)}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
