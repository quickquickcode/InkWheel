export type PlatformId = "xiaohongshu" | "toutiao" | "wechat";

export type ViewId = "discovery" | "studio" | "publishing" | "logs";

export type TopicConfig = {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
  days: number;
  limit: number;
  max_sources: number;
  rss_timeout_seconds: number;
  rss_max_workers: number;
};

export type RssSource = {
  id: string;
  name: string;
  xml_url: string;
  html_url?: string | null;
  enabled: boolean;
  last_fetched_at?: string | null;
  article_count: number;
  categories: string[];
};

export type ArticleItem = {
  id: string;
  title: string;
  source: string;
  source_id: string;
  url?: string | null;
  summary?: string | null;
  content?: string | null;
  published_at?: string | null;
  collected_at: string;
  topic_id?: string | null;
  score: number;
  rank: number;
};

export type ContentVariant = {
  platform: PlatformId;
  title: string;
  body: string;
  tags: string[];
  image_prompt?: string | null;
  estimated_read?: string | null;
  version: number;
};

export type PostDraft = {
  id: string;
  source_id: string;
  source_title: string;
  source_kind: "article";
  status: "generated" | "previewed" | "draft_only";
  variants: ContentVariant[];
  created_at: string;
};

export type AdapterStatus = {
  platform: PlatformId;
  label: string;
  mode: "preview" | "draft_only" | "not_connected";
  connected: boolean;
  state: "not_connected" | "preview_ready" | "draft_only";
  account: string;
  capability: string;
  next_step: string;
};

export type PlatformAccount = {
  platform: PlatformId;
  label: string;
  status: "unknown" | "connected" | "not_connected";
  cookie_path?: string | null;
  last_checked_at?: string | null;
  notes: string;
};

export type AdapterPreview = {
  platform: PlatformId;
  ok: boolean;
  mode: "preview";
  message: string;
  command_hint: string;
  payload: Record<string, unknown>;
};

export type AdapterResult = {
  platform: PlatformId;
  ok: boolean;
  mode: "preview" | "draft" | "manual_confirm";
  message: string;
  command: string;
  stdout: string;
  stderr: string;
  artifact_path?: string | null;
  requires_manual_confirm: boolean;
};

export type JobEvent = {
  id: string;
  kind: "rss_collect" | "generate" | "analyze" | "preview" | "execute_preview" | "account" | "sync" | "system";
  title: string;
  message: string;
  status: "success" | "running" | "warning" | "error" | "info";
  created_at: string;
};

export type RepoStatus = {
  name: string;
  path: string;
  remote_url?: string | null;
  current_commit?: string | null;
  commits_behind: number;
  dirty: boolean;
  last_sync?: string | null;
  error?: string | null;
};

export type ArticleScore = {
  article_id: string;
  topic_id: string;
  relevance_score: number;
  recency_score: number;
  source_weight: number;
  hot_score: number;
  rank: number;
  reason: string;
};

export type RankingItem = {
  article: ArticleItem;
  score: ArticleScore;
};

export type DashboardState = {
  topics: TopicConfig[];
  articles: ArticleItem[];
  rss_sources: RssSource[];
  posts: PostDraft[];
  adapters: AdapterStatus[];
  accounts: PlatformAccount[];
  jobs: JobEvent[];
  repos: RepoStatus[];
};

export type ArticleAnalysis = {
  article_id: string;
  summary: string;
  tags: string[];
  key_points: string[];
  audience: string;
  suitable_platforms: PlatformId[];
  tone: string;
  model: string;
};

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type JobProgressData = {
  job_id: string;
  status: JobStatus;
  title: string;
  message: string;
  percent: number;
  total: number;
  current: number;
  detail: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
};
