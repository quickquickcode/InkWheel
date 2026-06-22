from __future__ import annotations

from pathlib import Path

from app.adapters.base import PlatformAdapter
from app.core.config import get_settings
from app.models.schemas import AdapterPreview, AdapterResult, PlatformId, PostDraft


class XiaohongshuAdapter(PlatformAdapter):
    platform = PlatformId.xiaohongshu

    def preview(self, post: PostDraft) -> AdapterPreview:
        variant = self._variant(post)
        return AdapterPreview(
            platform=self.platform,
            ok=True,
            mode="preview",
            message="小红书适配器处于预览模式：只生成填充参数，不执行发布。",
            command_hint=(
                "python external/XiaohongshuSkills/scripts/publish_pipeline.py "
                "--preview --title <title> --content-file <content.txt> --images <image>"
            ),
            payload={
                "title": variant.title,
                "content": variant.body,
                "tags": variant.tags,
                "image_prompt": variant.image_prompt,
            },
        )

    def execute_preview(
        self, post: PostDraft, dry_run: bool = False
    ) -> AdapterResult:
        variant = self._variant(post)
        settings = get_settings()
        tmp = self._temp_dir(settings)
        content_path = tmp / f"xiaohongshu_{post.id}.txt"
        content_path.write_text(variant.body, encoding="utf-8")

        placeholder_image = (
            settings.project_root
            / "external"
            / "XiaohongshuSkills"
            / "public"
            / "whitedew.jpg"
        )
        if not placeholder_image.exists():
            placeholder_image = None

        cmd = [
            settings.python_bin,
            str(settings.xiaohongshu_publish_script),
            "--preview",
            "--title",
            variant.title,
            "--content-file",
            str(content_path),
        ]
        if placeholder_image:
            cmd.extend(["--images", str(placeholder_image)])
        else:
            # 没有本地占位图时，必须传一个媒体参数才能通过参数校验
            cmd.extend(["--image-urls", "https://example.com/placeholder.jpg"])

        command_str = " ".join(cmd)

        if dry_run:
            return AdapterResult(
                platform=self.platform,
                ok=True,
                mode="preview",
                message="干跑模式：未执行外部工具。",
                command=command_str,
                artifact_path=str(content_path),
                requires_manual_confirm=True,
            )

        rc, stdout, stderr = self._run_subprocess(cmd, timeout=180)
        ok = rc == 0
        return AdapterResult(
            platform=self.platform,
            ok=ok,
            mode="preview",
            message=(
                "小红书 CDP 预览已执行，浏览器中已填充表单，未点击发布。"
                if ok
                else f"小红书 CDP 预览失败：{stderr or stdout}"
            ),
            command=command_str,
            stdout=stdout,
            stderr=stderr,
            artifact_path=str(content_path),
            requires_manual_confirm=True,
        )
