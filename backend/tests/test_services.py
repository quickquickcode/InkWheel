from app.models.schemas import ArticleItem, PlatformId
from app.services.content import content_service


def test_content_service_generates_requested_platforms_only():
    article = ArticleItem(
        id="test_article_1",
        title="AI 智能体在教育场景的应用实践",
        source="Hacker News",
        source_id="rss_hackernews",
        collected_at="2026-06-15T12:00:00+00:00",
    )

    post, used_llm = content_service.generate(
        article, [PlatformId.xiaohongshu, PlatformId.wechat]
    )

    assert post.source_id == article.id
    assert post.source_kind == "article"
    assert [variant.platform for variant in post.variants] == [
        PlatformId.xiaohongshu,
        PlatformId.wechat,
    ]
    assert all(variant.title for variant in post.variants)
    assert not used_llm
