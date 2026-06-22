from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from itertools import count
from pathlib import Path
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
    RssSource,
)
from app.storage.repository import (
    apply_account_statuses,
    default_accounts,
    default_adapters,
    refresh_adapter_statuses,
    utc_now,
)


class SQLiteRepository:
    """基于 SQLite 的持久化仓库，将领域对象以 JSON 形式存储。"""

    def __init__(self, db_path: Optional[Path] = None) -> None:
        if db_path is None:
            root = Path(__file__).resolve().parents[3]
            db_path = root / "backend" / "data" / "cyberlab.db"
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()
        self._rank_counter = count(1)
        self.adapters = default_adapters()
        self.accounts = default_accounts()
        self.repos: list = []
        self._load_all()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS articles (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS rss_sources (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS accounts (
                    platform TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                );
                """
            )

    def _load_all(self) -> None:
        with self._connect() as conn:
            rows = conn.execute("SELECT data FROM articles").fetchall()
            self.articles = sorted(
                [ArticleItem(**json.loads(row["data"])) for row in rows],
                key=lambda a: a.collected_at or "",
                reverse=True,
            )

            rows = conn.execute("SELECT data FROM rss_sources").fetchall()
            self.rss_sources = [RssSource(**json.loads(row["data"])) for row in rows]

            rows = conn.execute("SELECT data FROM posts").fetchall()
            self.posts = sorted(
                [PostDraft(**json.loads(row["data"])) for row in rows],
                key=lambda p: p.created_at,
                reverse=True,
            )

            rows = conn.execute("SELECT data FROM jobs").fetchall()
            self.jobs = sorted(
                [JobEvent(**json.loads(row["data"])) for row in rows],
                key=lambda j: j.created_at,
                reverse=True,
            )[:120]

            rows = conn.execute("SELECT data FROM accounts").fetchall()
            loaded_accounts = [PlatformAccount(**json.loads(row["data"])) for row in rows]
            if loaded_accounts:
                self.accounts = loaded_accounts

        if not self.jobs:
            self.jobs = [
                JobEvent(
                    id="job_system_boot",
                    kind=JobKind.system,
                    title="系统通知",
                    message="实验控制台已就绪，平台适配器处于预览/草稿模式。",
                    status="info",
                    created_at=utc_now(),
                )
            ]
        self.adapters = apply_account_statuses(self.adapters, self.accounts)

    def _save_all(self, table: str, items: list) -> None:
        with self._connect() as conn:
            conn.execute(f"DELETE FROM {table}")
            conn.executemany(
                f"INSERT INTO {table} (id, data) VALUES (?, ?)",
                [(item.id, json.dumps(item.model_dump(), ensure_ascii=False)) for item in items],
            )

    def _save_accounts(self) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM accounts")
            conn.executemany(
                "INSERT INTO accounts (platform, data) VALUES (?, ?)",
                [
                    (
                        account.platform.value,
                        json.dumps(account.model_dump(), ensure_ascii=False),
                    )
                    for account in self.accounts
                ],
            )

    def add_post(self, post: PostDraft) -> None:
        self.posts.insert(0, post)
        self._save_all("posts", self.posts)

    def clear_content(self) -> dict[str, int]:
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
        self._save_all("articles", self.articles)
        self._save_all("rss_sources", self.rss_sources)
        self._save_all("posts", self.posts)
        self._save_all("jobs", self.jobs)
        return cleared

    def get_article(self, article_id: str) -> Optional[ArticleItem]:
        return next((item for item in self.articles if item.id == article_id), None)

    def get_post(self, post_id: str) -> Optional[PostDraft]:
        return next((post for post in self.posts if post.id == post_id), None)

    def replace_articles(self, articles: list[ArticleItem]) -> None:
        self.articles = articles
        self._save_all("articles", articles)

    def replace_rss_sources(self, sources: list[RssSource]) -> None:
        self.rss_sources = sources
        self._save_all("rss_sources", sources)

    def update_rss_source(self, source: RssSource) -> None:
        for index, existing in enumerate(self.rss_sources):
            if existing.id == source.id:
                self.rss_sources[index] = source
                break
        else:
            self.rss_sources.append(source)
        self._save_all("rss_sources", self.rss_sources)

    def replace_repos(self, repos: list) -> None:
        self.repos = repos

    def upsert_account(self, account: PlatformAccount) -> PlatformAccount:
        for index, existing in enumerate(self.accounts):
            if existing.platform == account.platform:
                self.accounts[index] = account
                break
        else:
            self.accounts.append(account)
        self._save_accounts()
        self.adapters = apply_account_statuses(self.adapters, self.accounts)
        return account

    def get_account(self, platform: PlatformId) -> PlatformAccount | None:
        return next((item for item in self.accounts if item.platform == platform), None)

    def update_adapter_statuses(
        self,
        executed_platform: PlatformId | None = None,
    ) -> None:
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
        self.jobs.insert(0, event)
        self.jobs = self.jobs[:120]
        self._save_all("jobs", self.jobs)
        return event
