from __future__ import annotations

import os

from app.adapters.base import PlatformAdapter
from app.core.config import get_settings
from app.models.schemas import AdapterPreview, AdapterResult, PlatformId, PostDraft


class WechatAdapter(PlatformAdapter):
    platform = PlatformId.wechat

    def preview(self, post: PostDraft) -> AdapterPreview:
        variant = self._variant(post)
        return AdapterPreview(
            platform=self.platform,
            ok=True,
            mode="preview",
            message="微信公众号适配器仅生成草稿预览，不调用真实公众号 API。",
            command_hint="node external/wemp-operator/scripts/content/publish.mjs --file <article.md>",
            payload={
                "markdown": variant.body,
                "digest": variant.body.splitlines()[2] if len(variant.body.splitlines()) > 2 else "",
                "image_prompt": variant.image_prompt,
            },
        )

    def execute_preview(
        self, post: PostDraft, dry_run: bool = False
    ) -> AdapterResult:
        variant = self._variant(post)
        settings = get_settings()
        tmp = self._temp_dir(settings)
        md_path = tmp / f"wechat_{post.id}.md"
        digest = variant.body.replace("#", "").replace("*", "").replace("`", "")[:120].strip()
        md_path.write_text(
            f"---\n"
            f"title: {variant.title}\n"
            f"digest: {digest}\n"
            f"author: CyberLab\n"
            f"---\n\n"
            f"{variant.body}\n",
            encoding="utf-8",
        )

        cmd = [
            settings.node_bin,
            str(settings.wemp_publish_script),
            "--file",
            str(md_path),
        ]
        command_str = " ".join(cmd)

        allow_draft = os.getenv("WEMP_ALLOW_DRAFT", "false").lower() == "true"

        if dry_run or not allow_draft:
            return AdapterResult(
                platform=self.platform,
                ok=True,
                mode="draft",
                message=(
                    "干跑模式：未调用微信公众号 API。"
                    if dry_run
                    else "微信公众号草稿创建已禁用（默认安全模式）。如需真实创建草稿，请设置 WEMP_ALLOW_DRAFT=true 并配置公众号。"
                ),
                command=command_str,
                artifact_path=str(md_path),
                requires_manual_confirm=True,
            )

        rc, stdout, stderr = self._run_subprocess(cmd, timeout=60)
        ok = rc == 0
        return AdapterResult(
            platform=self.platform,
            ok=ok,
            mode="draft",
            message=(
                "微信公众号草稿创建成功（已调用 wemp-operator）。"
                if ok
                else f"微信公众号草稿创建失败：{stderr or stdout}"
            ),
            command=command_str,
            stdout=stdout,
            stderr=stderr,
            artifact_path=str(md_path),
            requires_manual_confirm=True,
        )
