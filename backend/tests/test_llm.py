import pytest

from app.models.schemas import ArticleItem, PlatformId
from app.services.llm import LLMContentGenerator, OpenCodeClient


def _fake_chat_response(prompt: str):
    if "分析" in prompt or "analyze" in prompt:
        return (
            '{"summary": "这是一篇测试摘要", "tags": ["测试", "AI"], '
            '"key_points": ["第一点"], "audience": "学生", '
            '"suitable_platforms": ["xiaohongshu", "toutiao"], "tone": "轻松"}'
        )
    return (
        '{"title": "测试标题", "body": "测试正文内容", "tags": ["tag1", "tag2"], '
        '"image_prompt": "测试封面"}'
    )


@pytest.fixture
def mock_client(monkeypatch):
    def fake_chat(self, prompt: str, temperature: float = 0.7):
        return _fake_chat_response(prompt), type(
            "Usage",
            (),
            {"prompt_tokens": 10, "completion_tokens": 20, "model": "mimo-v2.5-free"},
        )()

    monkeypatch.setattr(OpenCodeClient, "chat", fake_chat)
    return OpenCodeClient()


def test_llm_analyze_article(mock_client):
    generator = LLMContentGenerator(mock_client)
    article = ArticleItem(
        id="a1",
        title="测试文章",
        source="Test",
        source_id="src1",
        summary="测试摘要",
        collected_at="2026-06-16T00:00:00+00:00",
    )

    analysis, usage = generator.analyze(article)

    assert analysis.summary == "这是一篇测试摘要"
    assert "测试" in analysis.tags
    assert PlatformId.xiaohongshu in analysis.suitable_platforms
    assert usage.prompt_tokens == 10


def test_llm_generate_content(mock_client):
    generator = LLMContentGenerator(mock_client)
    article = ArticleItem(
        id="a1",
        title="测试文章",
        source="Test",
        source_id="src1",
        summary="测试摘要",
        collected_at="2026-06-16T00:00:00+00:00",
    )

    post, usage = generator.generate(article, [PlatformId.xiaohongshu, PlatformId.toutiao])

    assert post.source_id == "a1"
    assert post.source_kind == "article"
    assert len(post.variants) == 2
    assert all(variant.body for variant in post.variants)
    assert usage.completion_tokens == 40
