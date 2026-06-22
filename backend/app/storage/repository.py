from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from itertools import count
from typing import Optional
from uuid import uuid4

from app.models.schemas import (
    AdapterStatus,
    ArticleItem,
    JobEvent,
    JobKind,
    PlatformAccount,
    PlatformId,
    PostDraft,
    RepoStatus,
    RssSource,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryRepository:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rank_counter = count(1)
        self.rss_sources: list[RssSource] = []
        self.articles: list[ArticleItem] = []
        self.posts: list[PostDraft] = []
        self.adapters = default_adapters()
        self.accounts = default_accounts()
        self.repos: list[RepoStatus] = []
        self.jobs: list[JobEvent] = [
            JobEvent(
                id="job_system_boot",
                kind=JobKind.system,
                title="系统通知",
                message="实验控制台已就绪，平台适配器处于预览/草稿模式。",
                status="info",
                created_at=utc_now(),
            )
        ]

    def add_post(self, post: PostDraft) -> None:
        with self._lock:
            self.posts.insert(0, post)

    def clear_content(self) -> dict[str, int]:
        with self._lock:
            cleared = {
                "articles": len(self.articles),
                "rss_sources": len(self.rss_sources),
                "posts": len(self.posts),
                "jobs": len(self.jobs),
            }
            self.articles = []
            self.rss_sources = []
            self.posts = []
            self.jobs = [
                JobEvent(
                    id="job_system_boot",
                    kind=JobKind.system,
                    title="系统通知",
                    message="持久化内容已清空，等待重新采集与生成。",
                    status="info",
                    created_at=utc_now(),
                )
            ]
            return cleared

    def get_article(self, article_id: str) -> Optional[ArticleItem]:
        with self._lock:
            return next((item for item in self.articles if item.id == article_id), None)

    def get_post(self, post_id: str) -> Optional[PostDraft]:
        with self._lock:
            return next((post for post in self.posts if post.id == post_id), None)

    def replace_articles(self, articles: list[ArticleItem]) -> None:
        with self._lock:
            self.articles = articles

    def replace_rss_sources(self, sources: list[RssSource]) -> None:
        with self._lock:
            self.rss_sources = sources

    def update_rss_source(self, source: RssSource) -> None:
        with self._lock:
            for index, existing in enumerate(self.rss_sources):
                if existing.id == source.id:
                    self.rss_sources[index] = source
                    return
            self.rss_sources.append(source)

    def replace_repos(self, repos: list[RepoStatus]) -> None:
        with self._lock:
            self.repos = repos

    def upsert_account(self, account: PlatformAccount) -> PlatformAccount:
        with self._lock:
            for index, existing in enumerate(self.accounts):
                if existing.platform == account.platform:
                    self.accounts[index] = account
                    break
            else:
                self.accounts.append(account)
            self.adapters = apply_account_statuses(self.adapters, self.accounts)
            return account

    def get_account(self, platform: PlatformId) -> PlatformAccount | None:
        with self._lock:
            return next((item for item in self.accounts if item.platform == platform), None)

    def update_adapter_statuses(
        self,
        executed_platform: PlatformId | None = None,
    ) -> None:
        with self._lock:
            self.adapters = refresh_adapter_statuses(self.adapters, executed_platform)

    def add_job(
        self,
        kind: JobKind,
        title: str,
        message: str,
        status: str = "success",
    ) -> JobEvent:
        event = JobEvent(
            id=f"job_{uuid4().hex[:10]}",
            kind=kind,
            title=title,
            message=message,
            status=status,  # type: ignore[arg-type]
            created_at=utc_now(),
        )
        with self._lock:
            self.jobs.insert(0, event)
            self.jobs = self.jobs[:120]
        return event


def default_adapters() -> list[AdapterStatus]:
    return [
        AdapterStatus(
            platform=PlatformId.xiaohongshu,
            label="小红书",
            mode="not_connected",
            connected=False,
            state="not_connected",
            account="未授权",
            capability="图文/视频发布预览",
            next_step="后续连接 XiaohongshuSkills 的 CDP preview 流程。",
        ),
        AdapterStatus(
            platform=PlatformId.toutiao,
            label="今日头条",
            mode="not_connected",
            connected=False,
            state="not_connected",
            account="未配置账号",
            capability="微头条发布准备",
            next_step="在前端配置 Cookie 文件后，可打开可见浏览器填入微头条。",
        ),
        AdapterStatus(
            platform=PlatformId.wechat,
            label="微信公众号",
            mode="draft_only",
            connected=False,
            state="draft_only",
            account="未绑定公众号",
            capability="Markdown 草稿生成",
            next_step="后续接入 wemp-operator 的草稿 API。",
        ),
    ]


def default_accounts() -> list[PlatformAccount]:
    return [
        PlatformAccount(
            platform=PlatformId.toutiao,
            label="默认头条账号",
            status="unknown",
            notes="可在前端绑定 Cookie 文件并检查登录态。",
        )
    ]


def apply_account_statuses(
    adapters: list[AdapterStatus],
    accounts: list[PlatformAccount],
) -> list[AdapterStatus]:
    account_map = {account.platform: account for account in accounts}
    updated: list[AdapterStatus] = []
    for adapter in adapters:
        account = account_map.get(adapter.platform)
        if not account:
            updated.append(adapter)
            continue
        connected = account.status == "connected"
        updated.append(
            adapter.model_copy(
                update={
                    "connected": connected,
                    "mode": "preview" if connected else "not_connected",
                    "state": "preview_ready" if connected else "not_connected",
                    "account": account.label if connected else f"{account.label}（未登录）",
                    "next_step": (
                        "已可打开可见浏览器准备微头条，最终发布由用户在头条页面确认。"
                        if connected
                        else "请先检查登录态或点击登录，完成后再发布。"
                    ),
                }
            )
        )
    return updated


def refresh_adapter_statuses(
    adapters: list[AdapterStatus],
    executed_platform: PlatformId | None = None,
) -> list[AdapterStatus]:
    updated: list[AdapterStatus] = []
    for adapter in adapters:
        if executed_platform is None:
            updated.append(adapter)
            continue
        if adapter.platform == executed_platform:
            is_wechat = executed_platform == PlatformId.wechat
            updated.append(
                adapter.model_copy(
                    update={
                        "connected": True,
                        "mode": "draft_only" if is_wechat else "preview",
                        "state": "draft_only" if is_wechat else "preview_ready",
                    }
                )
            )
        else:
            updated.append(adapter)
    return updated


if os.getenv("CYBERLAB_MEMORY_REPO") == "1":
    repo: MemoryRepository | SQLiteRepository = MemoryRepository()
else:
    from app.storage.sqlite_repository import SQLiteRepository

    repo = SQLiteRepository()


def get_repo() -> MemoryRepository | SQLiteRepository:
    return repo
