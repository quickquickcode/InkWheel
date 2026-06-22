from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.models.schemas import ArticleItem, ArticleScore, RankingItem, TopicConfig
from app.services.topics import topic_service


class RankingService:
    """基于规则的文章排行榜/推荐榜服务。

    评分维度：
    - relevance_score：标题与摘要命中话题关键词的次数
    - recency_score：发布时间越近越高
    - source_weight：来源本身权重（可后续扩展）
    - hot_score：0.5 * relevance + 0.3 * recency + 0.2 * source_weight
    """

    def score_article(
        self,
        article: ArticleItem,
        topic: TopicConfig,
        source_weights: Optional[dict[str, float]] = None,
    ) -> ArticleScore:
        source_weights = source_weights or {}

        text = (article.title or "") + " " + (article.summary or "")
        text_lower = text.lower()

        relevance_hits = sum(1 for kw in topic.keywords if kw.lower() in text_lower)
        # 归一化到 0-1，假设最多命中 5 个关键词为满分
        relevance_score = min(relevance_hits / 5.0, 1.0)

        recency_score = self._recency_score(article.published_at)
        source_weight = source_weights.get(article.source_id, 0.5)

        hot_score = (
            0.5 * relevance_score
            + 0.3 * recency_score
            + 0.2 * source_weight
        )

        return ArticleScore(
            article_id=article.id,
            topic_id=topic.id,
            relevance_score=round(relevance_score, 3),
            recency_score=round(recency_score, 3),
            source_weight=round(source_weight, 3),
            hot_score=round(hot_score, 3),
            rank=0,
            reason=f"命中 {relevance_hits} 个关键词，时效分 {recency_score:.2f}",
        )

    def _recency_score(self, published_at: Optional[str]) -> float:
        if not published_at:
            return 0.3
        try:
            dt = datetime.fromisoformat(published_at)
            now = datetime.now(timezone.utc)
            delta_hours = (now - dt).total_seconds() / 3600
        except Exception:
            return 0.3

        if delta_hours < 0:
            delta_hours = 0
        # 24 小时内 1.0，7 天内线性衰减到 0.3，更久则 0.1
        if delta_hours <= 24:
            return 1.0
        if delta_hours <= 24 * 7:
            return 1.0 - (delta_hours - 24) / (24 * 7) * 0.7
        return 0.1

    def rank(
        self,
        articles: list[ArticleItem],
        topic_id: str,
        limit: int = 20,
    ) -> list[RankingItem]:
        topic = topic_service.get_topic(topic_id)
        if not topic:
            return []

        items: list[RankingItem] = []
        for article in articles:
            # 只对该话题的文章打分
            if article.topic_id and article.topic_id != topic_id:
                continue
            score = self.score_article(article, topic)
            items.append(RankingItem(article=article, score=score))

        items.sort(key=lambda x: x.score.hot_score, reverse=True)
        for idx, item in enumerate(items, start=1):
            item.score.rank = idx
            item.article.rank = idx
        return items[:limit]


ranking_service = RankingService()
