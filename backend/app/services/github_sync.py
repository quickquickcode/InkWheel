from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.models.schemas import RepoStatus
from app.storage.repository import utc_now


class GithubSyncService:
    def __init__(self) -> None:
        settings = get_settings()
        self.repo_paths = {
            "toutiao": settings.project_root / "external" / "toutiao",
            "xiaohongshu": settings.project_root / "external" / "XiaohongshuSkills",
            "wemp-operator": settings.project_root / "external" / "wemp-operator",
        }

    def _run(self, cwd: Path, *cmd: str) -> tuple[int, str, str]:
        try:
            completed = subprocess.run(
                ["git", *cmd],
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=30,
            )
            return completed.returncode, completed.stdout, completed.stderr
        except Exception as exc:
            return 1, "", str(exc)

    def status(self, name: str) -> RepoStatus:
        path = self.repo_paths.get(name)
        if not path or not path.exists():
            return RepoStatus(
                name=name,
                path=str(path) if path else "",
                error="仓库目录不存在",
            )

        rc, commit, _ = self._run(path, "rev-parse", "HEAD")
        current_commit = commit.strip() if rc == 0 else None

        rc, status_out, _ = self._run(path, "status", "--short")
        dirty = rc == 0 and bool(status_out.strip())

        behind = 0
        if current_commit:
            rc, behind_out, _ = self._run(
                path, "rev-list", "--count", "HEAD..@{upstream}"
            )
            if rc == 0:
                try:
                    behind = int(behind_out.strip())
                except ValueError:
                    behind = 0

        return RepoStatus(
            name=name,
            path=str(path),
            current_commit=current_commit,
            commits_behind=behind,
            dirty=dirty,
            last_sync=utc_now(),
        )

    def status_all(self) -> list[RepoStatus]:
        return [self.status(name) for name in self.repo_paths]

    def pull(self, path: str | Path) -> RepoStatus:
        path_obj = Path(path)
        name = path_obj.name
        rc, stdout, stderr = self._run(path_obj, "pull")
        status = self.status(name)
        if rc != 0:
            status.error = (stderr or stdout or "git pull 失败").strip()
        return status
