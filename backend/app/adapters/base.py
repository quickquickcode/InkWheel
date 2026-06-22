from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.core.config import Settings, get_settings
from app.models.schemas import AdapterPreview, AdapterResult, PlatformId, PostDraft


class PlatformAdapter(ABC):
    platform: PlatformId

    @abstractmethod
    def preview(self, post: PostDraft) -> AdapterPreview:
        raise NotImplementedError

    @abstractmethod
    def execute_preview(
        self, post: PostDraft, dry_run: bool = False
    ) -> AdapterResult:
        """真实调用外部工具的 preview/draft 模式，不触发最终发布。"""
        raise NotImplementedError

    def _variant(self, post: PostDraft):
        variant = next(
            (item for item in post.variants if item.platform == self.platform),
            None,
        )
        if variant is None:
            raise ValueError(f"Post {post.id} does not include variant for {self.platform.value}")
        return variant

    def _temp_dir(self, settings: Optional[Settings] = None) -> Path:
        settings = settings or get_settings()
        tmp = settings.project_root / "artifacts" / "tmp"
        tmp.mkdir(parents=True, exist_ok=True)
        return tmp

    def _run_subprocess(
        self,
        cmd: list[str],
        timeout: int = 60,
        cwd: Optional[Path] = None,
        env: Optional[dict[str, str]] = None,
    ) -> tuple[int, str, str]:
        import os
        import subprocess

        try:
            completed = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env={**os.environ, **(env or {})},
            )
            return completed.returncode, completed.stdout, completed.stderr
        except subprocess.TimeoutExpired as exc:
            return 1, "", f"命令执行超时（{timeout}s）"
        except Exception as exc:
            return 1, "", str(exc)
