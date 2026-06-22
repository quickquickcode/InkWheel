from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class PlatformId(str, Enum):
    xiaohongshu = "xiaohongshu"
    toutiao = "toutiao"
    wechat = "wechat"


class JobKind(str, Enum):
    rss_collect = "rss_collect"
    generate = "generate"
    analyze = "analyze"
    preview = "preview"
    execute_preview = "execute_preview"
    account = "account"
    sync = "sync"
    system = "system"


class RssSource(BaseModel):
    id: str
    name: str
    xml_url: str
    html_url: Optional[str] = None
    enabled: bool = True
    last_fetched_at: Optional[str] = None
    article_count: int = 0
    categories: list[str] = []


class ArticleItem(BaseModel):
    id: str
    title: str
    source: str
    source_id: str
    url: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    published_at: Optional[str] = None
    collected_at: str
    topic_id: Optional[str] = None
    score: float = 0.0
    rank: int = 0


class ContentVariant(BaseModel):
    platform: PlatformId
    title: str
    body: str
    tags: list[str] = []
    image_prompt: Optional[str] = None
    estimated_read: Optional[str] = None
    version: int = 1


class PostDraft(BaseModel):
    id: str
    source_id: str
    source_title: str
    source_kind: Literal["article"] = "article"
    status: Literal["generated", "previewed", "draft_only"] = "generated"
    variants: list[ContentVariant]
    created_at: str


class AdapterStatus(BaseModel):
    platform: PlatformId
    label: str
    mode: Literal["preview", "draft_only", "not_connected"]
    connected: bool
    state: Literal["not_connected", "preview_ready", "draft_only"]
    account: str
    capability: str
    next_step: str


class PlatformAccount(BaseModel):
    platform: PlatformId
    label: str
    status: Literal["unknown", "connected", "not_connected"] = "unknown"
    cookie_path: Optional[str] = None
    last_checked_at: Optional[str] = None
    notes: str = ""


class AdapterPreview(BaseModel):
    platform: PlatformId
    ok: bool
    mode: Literal["preview"]
    message: str
    command_hint: str
    payload: dict


class AdapterResult(BaseModel):
    platform: PlatformId
    ok: bool
    mode: Literal["preview", "draft", "manual_confirm"]
    message: str
    command: str
    stdout: str = ""
    stderr: str = ""
    artifact_path: Optional[str] = None
    requires_manual_confirm: bool = False


class JobEvent(BaseModel):
    id: str
    kind: JobKind
    title: str
    message: str
    status: Literal["success", "running", "warning", "error", "info"]
    created_at: str


class RssCollectRequest(BaseModel):
    source_ids: list[str] = []
    keyword: Optional[str] = None
    days: int = Field(default=7, ge=1, le=30)
    limit: int = Field(default=50, ge=1, le=200)


class RssCollectResponse(BaseModel):
    items: list[ArticleItem]
    sources: list[RssSource]
    job: JobEvent


class TopicConfig(BaseModel):
    id: str
    name: str
    description: str
    icon: str = "rss"
    keywords: list[str]
    source_ids: list[str] = []
    days: int = 7
    limit: int = 50
    max_sources: int = 50
    rss_timeout_seconds: int = 8
    rss_max_workers: int = 4


class TopicCollectRequest(BaseModel):
    topic_id: str
    keyword: Optional[str] = None
    days: Optional[int] = None
    limit: Optional[int] = None


class TopicCollectResponse(BaseModel):
    topic: TopicConfig
    items: list[ArticleItem]
    sources: list[RssSource]
    job: JobEvent


class ArticleScore(BaseModel):
    article_id: str
    topic_id: str
    relevance_score: float
    recency_score: float
    source_weight: float
    hot_score: float
    rank: int
    reason: str


class RankingItem(BaseModel):
    article: ArticleItem
    score: ArticleScore


class RankingResponse(BaseModel):
    topic: TopicConfig
    items: list[RankingItem]


class ArticleAnalysis(BaseModel):
    article_id: str
    summary: str
    tags: list[str]
    key_points: list[str]
    audience: str
    suitable_platforms: list[PlatformId]
    tone: str
    model: str


class LLMUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model: str


class AnalyzeRequest(BaseModel):
    article_id: str
    topic_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    analysis: ArticleAnalysis
    usage: LLMUsage
    job: JobEvent


class GenerateRequest(BaseModel):
    article_id: str
    platforms: list[PlatformId] = [
        PlatformId.xiaohongshu,
        PlatformId.toutiao,
        PlatformId.wechat,
    ]
    use_llm: bool = False
    topic_id: Optional[str] = None


class GenerateResponse(BaseModel):
    post: PostDraft
    job: JobEvent
    usage: Optional[LLMUsage] = None


class PreviewRequest(BaseModel):
    post_id: str
    platform: PlatformId


class PreviewResponse(BaseModel):
    preview: AdapterPreview
    job: JobEvent
    adapters: list[AdapterStatus]


class ExecutePreviewRequest(BaseModel):
    post_id: str
    platform: PlatformId
    dry_run: bool = False


class ExecutePreviewResponse(BaseModel):
    result: AdapterResult
    job: JobEvent
    adapters: list[AdapterStatus]


class ClearContentResponse(BaseModel):
    ok: bool
    cleared: dict[str, int]


class ToutiaoAccountUpdateRequest(BaseModel):
    label: str = "默认头条账号"
    cookie_path: Optional[str] = None
    notes: str = ""


class ToutiaoAccountResponse(BaseModel):
    account: PlatformAccount
    adapter: AdapterStatus


class ToutiaoLoginResponse(BaseModel):
    job_id: str
    account: PlatformAccount
    command: str


class ToutiaoMicroPublishRequest(BaseModel):
    post_id: str
    topic: Optional[str] = None
    use_title: bool = True


class ToutiaoMicroPublishResponse(BaseModel):
    job_id: str
    title: str
    status: AsyncJobStatus
    command: str
    artifact_path: str


class RepoStatus(BaseModel):
    name: str
    path: str
    remote_url: Optional[str] = None
    current_commit: Optional[str] = None
    commits_behind: int = 0
    dirty: bool = False
    last_sync: Optional[str] = None
    error: Optional[str] = None


class JobsResponse(BaseModel):
    items: list[JobEvent]


class DashboardState(BaseModel):
    topics: list[TopicConfig]
    articles: list[ArticleItem]
    rss_sources: list[RssSource]
    posts: list[PostDraft]
    adapters: list[AdapterStatus]
    accounts: list[PlatformAccount] = []
    jobs: list[JobEvent]
    repos: list[RepoStatus]


class ApiStatus(BaseModel):
    name: str = "CyberLab ContentOps API"
    environment: str = "dev"
    rss_available: bool
    opencode_available: bool = False
    topics: list[TopicConfig]
    adapters: list[AdapterStatus]


class AsyncJobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class JobProgressData(BaseModel):
    job_id: str
    status: AsyncJobStatus
    title: str
    message: str
    percent: int = 0
    total: int = 0
    current: int = 0
    detail: dict[str, Any] = {}
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class TopicCollectAsyncRequest(BaseModel):
    topic_id: str
    keyword: Optional[str] = None
    days: Optional[int] = None
    limit: Optional[int] = None


class TopicCollectAsyncResponse(BaseModel):
    job_id: str
    title: str
    status: AsyncJobStatus


class GenerateAsyncRequest(BaseModel):
    article_id: str
    platforms: list[PlatformId] = [
        PlatformId.xiaohongshu,
        PlatformId.toutiao,
        PlatformId.wechat,
    ]
    use_llm: bool = False
    topic_id: Optional[str] = None


class GenerateAsyncResponse(BaseModel):
    job_id: str
    title: str
    status: AsyncJobStatus


class GenerateFusedRequest(BaseModel):
    article_ids: list[str] = Field(..., min_length=1)
    platforms: list[PlatformId] = [
        PlatformId.xiaohongshu,
        PlatformId.toutiao,
        PlatformId.wechat,
    ]
    use_llm: bool = False
    topic_id: Optional[str] = None
    user_prompt: Optional[str] = None


class GenerateFusedResponse(BaseModel):
    post: PostDraft
    job: JobEvent
    usage: Optional[LLMUsage] = None


class GenerateFusedAsyncResponse(BaseModel):
    job_id: str
    title: str
    status: AsyncJobStatus
