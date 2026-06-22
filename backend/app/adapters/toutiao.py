from __future__ import annotations

from pathlib import Path
from shlex import quote, split

from app.adapters.base import PlatformAdapter
from app.core.config import get_settings
from app.models.schemas import AdapterPreview, AdapterResult, PlatformId, PostDraft


class ToutiaoAdapter(PlatformAdapter):
    platform = PlatformId.toutiao

    def preview(self, post: PostDraft) -> AdapterPreview:
        variant = self._variant(post)
        return AdapterPreview(
            platform=self.platform,
            ok=True,
            mode="preview",
            message="今日头条微头条预览就绪：发布时会打开可见 Playwright 浏览器，用户在页面内最终确认。",
            command_hint="python3 external/toutiao/toutiao_cli/cli.py micro publish -f <micro.md>",
            payload={
                "content": variant.body,
                "topic": " ".join(variant.tags[:2]),
                "images": [],
            },
        )

    def execute_preview(
        self, post: PostDraft, dry_run: bool = False
    ) -> AdapterResult:
        variant = self._variant(post)
        tmp = self._temp_dir()
        md_path = self.write_micro_artifact(post)
        command = self.micro_command(md_path, variant.tags[:2])

        if dry_run:
            return AdapterResult(
                platform=self.platform,
                ok=True,
                mode="manual_confirm",
                message="干跑模式：已生成微头条内容文件，未打开浏览器。",
                command=command,
                artifact_path=str(md_path),
                requires_manual_confirm=True,
            )

        rc, stdout, stderr = self._run_subprocess(split(command), timeout=360)
        ok = rc == 0
        return AdapterResult(
            platform=self.platform,
            ok=ok,
            mode="manual_confirm",
            message=(
                "已打开今日头条微头条发布页并填入内容，请在浏览器中人工检查后点击发布。"
                if ok
                else f"今日头条微头条准备失败：{stderr or stdout}"
            ),
            command=command,
            stdout=stdout,
            stderr=stderr,
            artifact_path=str(md_path),
            requires_manual_confirm=True,
        )

    def write_micro_artifact(self, post: PostDraft) -> Path:
        variant = self._variant(post)
        tmp = self._temp_dir()
        md_path = tmp / f"toutiao_micro_{post.id}.md"
        md_path.write_text(
            f"# {variant.title}\n\n{variant.body}\n\n"
            f"{' '.join('#' + t for t in variant.tags)}\n",
            encoding="utf-8",
        )
        return md_path

    def micro_command(self, md_path: Path, tags: list[str] | None = None) -> str:
        settings = get_settings()
        cmd = [
            settings.toutiao_python_bin,
            str(settings.toutiao_cli_script),
            "micro",
            "publish",
            "--file",
            str(md_path),
        ]
        topic = " ".join(tags or [])
        if topic:
            cmd.extend(["--topic", topic])
        return " ".join(quote(part) for part in cmd)
