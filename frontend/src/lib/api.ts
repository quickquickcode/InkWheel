import type {
  AdapterPreview,
  AdapterResult,
  AdapterStatus,
  ArticleAnalysis,
  ArticleItem,
  DashboardState,
  JobEvent,
  JobProgressData,
  PlatformAccount,
  PlatformId,
  PostDraft,
  RankingItem,
  RepoStatus,
  RssSource,
  TopicConfig,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getDashboard() {
  return api<DashboardState>("/api/dashboard");
}

export function getRssSources() {
  return api<{ items: RssSource[] }>("/api/rss/sources");
}

export function getTopics() {
  return api<{ items: TopicConfig[] }>("/api/topics");
}

export function collectRssByTopic(topicId: string, keyword?: string, days?: number, limit?: number) {
  return api<{
    topic: TopicConfig;
    items: ArticleItem[];
    sources: RssSource[];
    job: JobEvent;
  }>("/api/rss/collect-by-topic", {
    method: "POST",
    body: JSON.stringify({
      topic_id: topicId,
      keyword: keyword?.trim() || null,
      days,
      limit,
    }),
  });
}

export function collectRssByTopicAsync(topicId: string, keyword?: string, days?: number, limit?: number) {
  return api<{ job_id: string; title: string; status: JobProgressData["status"] }>(
    "/api/rss/collect-by-topic-async",
    {
      method: "POST",
      body: JSON.stringify({
        topic_id: topicId,
        keyword: keyword?.trim() || null,
        days,
        limit,
      }),
    },
  );
}

export function getRankings(topicId: string, limit = 10) {
  return api<{ topic: TopicConfig; items: RankingItem[] }>(
    `/api/rankings?topic_id=${encodeURIComponent(topicId)}&limit=${limit}`,
  );
}

export function getArticle(articleId: string) {
  return api<ArticleItem>(`/api/articles/${articleId}`);
}

export function analyzeArticle(articleId: string, topicId?: string) {
  return api<{ analysis: ArticleAnalysis; usage: { prompt_tokens: number; completion_tokens: number; model: string }; job: JobEvent }>(
    "/api/content/analyze",
    {
      method: "POST",
      body: JSON.stringify({ article_id: articleId, topic_id: topicId }),
    },
  );
}

export function generateContent({
  articleId,
  platforms,
  useLlm,
  topicId,
}: {
  articleId: string;
  platforms: PlatformId[];
  useLlm?: boolean;
  topicId?: string;
}) {
  return api<{ post: PostDraft; job: JobEvent; usage?: unknown }>("/api/content/generate", {
    method: "POST",
    body: JSON.stringify({
      article_id: articleId,
      platforms,
      use_llm: useLlm ?? false,
      topic_id: topicId,
    }),
  });
}

export function generateContentAsync({
  articleId,
  platforms,
  useLlm,
  topicId,
}: {
  articleId: string;
  platforms: PlatformId[];
  useLlm?: boolean;
  topicId?: string;
}) {
  return api<{ job_id: string; title: string; status: JobProgressData["status"] }>(
    "/api/content/generate-async",
    {
      method: "POST",
      body: JSON.stringify({
        article_id: articleId,
        platforms,
        use_llm: useLlm ?? false,
        topic_id: topicId,
      }),
    },
  );
}

export function generateContentFused({
  articleIds,
  platforms,
  useLlm,
  topicId,
  userPrompt,
}: {
  articleIds: string[];
  platforms: PlatformId[];
  useLlm?: boolean;
  topicId?: string;
  userPrompt?: string;
}) {
  return api<{ post: PostDraft; job: JobEvent; usage?: unknown }>("/api/content/generate-fused", {
    method: "POST",
    body: JSON.stringify({
      article_ids: articleIds,
      platforms,
      use_llm: useLlm ?? false,
      topic_id: topicId,
      user_prompt: userPrompt?.trim() || null,
    }),
  });
}

export function generateContentFusedAsync({
  articleIds,
  platforms,
  useLlm,
  topicId,
  userPrompt,
}: {
  articleIds: string[];
  platforms: PlatformId[];
  useLlm?: boolean;
  topicId?: string;
  userPrompt?: string;
}) {
  return api<{ job_id: string; title: string; status: JobProgressData["status"] }>(
    "/api/content/generate-fused-async",
    {
      method: "POST",
      body: JSON.stringify({
        article_ids: articleIds,
        platforms,
        use_llm: useLlm ?? false,
        topic_id: topicId,
        user_prompt: userPrompt?.trim() || null,
      }),
    },
  );
}

export function getJob(jobId: string) {
  return api<JobProgressData>(`/api/jobs/${jobId}`);
}

export function streamJob(
  jobId: string,
  onProgress: (progress: JobProgressData) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
) {
  const source = new EventSource(`${API_BASE}/api/jobs/${jobId}/stream`);

  source.onmessage = (event) => {
    try {
      const progress: JobProgressData = JSON.parse(event.data);
      onProgress(progress);
      if (progress.status === "completed" || progress.status === "failed" || progress.status === "cancelled") {
        source.close();
        onDone?.();
      }
    } catch (error) {
      source.close();
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  source.onerror = () => {
    source.close();
    onError?.(new Error("SSE 连接中断"));
  };

  return source;
}

export function previewPublish(postId: string, platform: PlatformId) {
  return api<{ preview: AdapterPreview; job: JobEvent; adapters: AdapterStatus[] }>("/api/publish/preview", {
    method: "POST",
    body: JSON.stringify({
      post_id: postId,
      platform,
    }),
  });
}

export function executePreview(postId: string, platform: PlatformId, dryRun = false) {
  return api<{ result: AdapterResult; job: JobEvent; adapters: AdapterStatus[] }>("/api/publish/execute-preview", {
    method: "POST",
    body: JSON.stringify({
      post_id: postId,
      platform,
      dry_run: dryRun,
    }),
  });
}

export function clearPersistedContent() {
  return api<{ ok: boolean; cleared: Record<string, number> }>("/api/admin/clear-content", {
    method: "POST",
  });
}

export function getToutiaoAccount() {
  return api<{ account: PlatformAccount; adapter: AdapterStatus }>("/api/accounts/toutiao");
}

export function updateToutiaoAccount(payload: { label: string; cookiePath?: string; notes?: string }) {
  return api<{ account: PlatformAccount; adapter: AdapterStatus }>("/api/accounts/toutiao", {
    method: "PUT",
    body: JSON.stringify({
      label: payload.label,
      cookie_path: payload.cookiePath || null,
      notes: payload.notes || "",
    }),
  });
}

export function checkToutiaoAccount() {
  return api<{ account: PlatformAccount; adapter: AdapterStatus }>("/api/accounts/toutiao/check", {
    method: "POST",
  });
}

export function loginToutiaoAccount() {
  return api<{ job_id: string; account: PlatformAccount; command: string }>("/api/accounts/toutiao/login", {
    method: "POST",
  });
}

export function publishToutiaoMicro(postId: string, topic?: string) {
  return api<{ job_id: string; title: string; status: JobProgressData["status"]; command: string; artifact_path: string }>(
    "/api/publish/toutiao/micro",
    {
      method: "POST",
      body: JSON.stringify({
        post_id: postId,
        topic: topic?.trim() || null,
      }),
    },
  );
}

export function listExternalRepos() {
  return api<{ items: RepoStatus[] }>("/api/external-repos");
}

export function syncExternalRepo(name: string) {
  return api<{ repo: RepoStatus }>("/api/external-repos/sync", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
