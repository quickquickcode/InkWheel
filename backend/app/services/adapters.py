from __future__ import annotations

from app.adapters.base import PlatformAdapter
from app.adapters.toutiao import ToutiaoAdapter
from app.adapters.wechat import WechatAdapter
from app.adapters.xiaohongshu import XiaohongshuAdapter
from app.models.schemas import AdapterPreview, AdapterResult, PlatformId, PostDraft


class AdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[PlatformId, PlatformAdapter] = {
            PlatformId.xiaohongshu: XiaohongshuAdapter(),
            PlatformId.toutiao: ToutiaoAdapter(),
            PlatformId.wechat: WechatAdapter(),
        }

    def preview(self, platform: PlatformId, post: PostDraft) -> AdapterPreview:
        adapter = self._adapters[platform]
        return adapter.preview(post)

    def execute_preview(
        self, platform: PlatformId, post: PostDraft, dry_run: bool = False
    ) -> AdapterResult:
        adapter = self._adapters[platform]
        return adapter.execute_preview(post, dry_run=dry_run)


adapter_registry = AdapterRegistry()
