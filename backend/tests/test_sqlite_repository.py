"""默认 SQLite 仓库回归测试。

确保 SQLiteRepository 与 MemoryRepository 暴露同样的核心属性与方法，
且 DashboardState 所需的序列化能正常进行。
"""

from __future__ import annotations

import pytest

from app.storage.sqlite_repository import SQLiteRepository


@pytest.fixture
def sqlite_repo(tmp_path):
    return SQLiteRepository(db_path=tmp_path / "cyberlab.db")


def test_sqlite_repo_attribute_parity(sqlite_repo):
    """SQLiteRepository 必须与 MemoryRepository 暴露相同的核心属性。"""
    for attr in (
        "rss_sources",
        "articles",
        "posts",
        "adapters",
        "repos",
        "jobs",
    ):
        assert hasattr(sqlite_repo, attr), f"缺失属性: {attr}"


def test_sqlite_repo_dashboard_payload_is_serializable(sqlite_repo):
    """模拟 /api/dashboard 返回的 payload，确保所有字段可被 Pydantic/JSON 处理。"""
    payload = {
        "articles": [a.model_dump() for a in sqlite_repo.articles],
        "rss_sources": [s.model_dump() for s in sqlite_repo.rss_sources],
        "posts": [p.model_dump() for p in sqlite_repo.posts],
        "adapters": [a.model_dump() for a in sqlite_repo.adapters],
        "jobs": [j.model_dump() for j in sqlite_repo.jobs],
        "repos": [r.model_dump() for r in sqlite_repo.repos] if sqlite_repo.repos else [],
    }
    assert len(payload["adapters"]) == 3
