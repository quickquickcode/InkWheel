from pathlib import Path

import pytest

from app.adapters.toutiao import ToutiaoAdapter
from app.adapters.wechat import WechatAdapter
from app.adapters.xiaohongshu import XiaohongshuAdapter
from app.models.schemas import ContentVariant, PlatformId, PostDraft


def _sample_post() -> PostDraft:
    return PostDraft(
        id="post_123",
        source_id="src_123",
        source_title="测试标题",
        source_kind="article",
        variants=[
            ContentVariant(
                platform=PlatformId.xiaohongshu,
                title="小红书标题",
                body="这是小红书内容",
                tags=["tag1", "tag2"],
            ),
            ContentVariant(
                platform=PlatformId.toutiao,
                title="今日头条标题",
                body="这是今日头条内容",
                tags=["tag1", "tag2"],
            ),
            ContentVariant(
                platform=PlatformId.wechat,
                title="微信标题",
                body="这是微信内容",
                tags=["tag1", "tag2"],
            ),
        ],
        created_at="2026-06-16T00:00:00+00:00",
    )


def test_toutiao_preview_returns_payload():
    adapter = ToutiaoAdapter()
    post = _sample_post()
    preview = adapter.preview(post)

    assert preview.platform == PlatformId.toutiao
    assert preview.ok is True
    assert "toutiao_cli/cli.py" in preview.command_hint
    assert "content" in preview.payload


def test_toutiao_execute_preview_dry_run():
    adapter = ToutiaoAdapter()
    post = _sample_post()
    result = adapter.execute_preview(post, dry_run=True)

    assert result.platform == PlatformId.toutiao
    assert result.ok is True
    assert result.mode == "manual_confirm"
    assert result.requires_manual_confirm is True
    assert "micro publish" in result.command


def test_toutiao_preview_explains_visible_browser_manual_publish():
    adapter = ToutiaoAdapter()
    post = _sample_post()
    preview = adapter.preview(post)

    assert "可见 Playwright 浏览器" in preview.message
    assert "micro publish" in preview.command_hint


def test_xiaohongshu_preview_returns_payload():
    adapter = XiaohongshuAdapter()
    post = _sample_post()
    preview = adapter.preview(post)

    assert preview.platform == PlatformId.xiaohongshu
    assert preview.ok is True
    assert "publish_pipeline.py" in preview.command_hint


def test_xiaohongshu_execute_preview_dry_run(tmp_path, monkeypatch):
    monkeypatch.setattr("app.adapters.xiaohongshu.get_settings", lambda: type(
        "S",
        (),
        {
            "python_bin": "python3",
            "xiaohongshu_publish_script": Path("/fake/publish_pipeline.py"),
            "project_root": tmp_path,
        },
    )())
    adapter = XiaohongshuAdapter()
    post = _sample_post()
    result = adapter.execute_preview(post, dry_run=True)

    assert result.platform == PlatformId.xiaohongshu
    assert result.ok is True
    assert result.mode == "preview"
    assert "--preview" in result.command


def test_wechat_execute_preview_default_safe():
    adapter = WechatAdapter()
    post = _sample_post()
    result = adapter.execute_preview(post, dry_run=False)

    assert result.platform == PlatformId.wechat
    assert result.ok is True
    assert result.mode == "draft"
    assert result.requires_manual_confirm is True
    assert "publish.mjs" in result.command
