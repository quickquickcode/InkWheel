from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml

from app.core.config import Settings, get_settings
from app.models.schemas import RssSource, TopicConfig


class TopicService:
    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._topics: Optional[list[TopicConfig]] = None
        self._source_categories: Optional[dict[str, list[str]]] = None

    def _topics_path(self) -> Path:
        return self.settings.project_root / "backend" / "resources" / "topics.yaml"

    def _categories_path(self) -> Path:
        return self.settings.project_root / "backend" / "resources" / "source_categories.json"

    def load_topics(self) -> list[TopicConfig]:
        if self._topics is None:
            path = self._topics_path()
            if path.exists():
                data = yaml.safe_load(path.read_text(encoding="utf-8"))
                self._topics = [TopicConfig(**t) for t in data.get("topics", [])]
            else:
                self._topics = []
        return self._topics

    def get_topic(self, topic_id: str) -> Optional[TopicConfig]:
        for topic in self.load_topics():
            if topic.id == topic_id:
                return topic
        return None

    def load_source_categories(self) -> dict[str, list[str]]:
        if self._source_categories is None:
            path = self._categories_path()
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                # 忽略 _meta 等非 source_id 的键
                self._source_categories = {
                    k: v for k, v in data.items() if isinstance(v, list)
                }
            else:
                self._source_categories = {}
        return self._source_categories

    def enrich_sources(self, sources: list[RssSource]) -> list[RssSource]:
        """给源站附加 categories 字段。"""
        categories = self.load_source_categories()
        for source in sources:
            source.categories = categories.get(source.id, [])
        return sources

    def sources_for_topic(
        self, sources: list[RssSource], topic_id: str, max_sources: Optional[int] = None
    ) -> list[RssSource]:
        """从源站列表中筛选出属于指定话题的源。

        优先使用 topics.yaml 中显式声明的 source_ids 作为白名单；
        若未声明，则使用 source_categories.json 中的分类标签。
        最后随机打乱并取前 N 个，避免每次都命中同一批慢源。
        """
        topic = self.get_topic(topic_id)
        if not topic:
            return []

        source_map = {s.id: s for s in sources}
        matched: list[RssSource] = []

        # 1. 优先使用 topic 显式 source_ids
        for sid in topic.source_ids:
            if sid in source_map and sid not in {s.id for s in matched}:
                matched.append(source_map[sid])

        # 2. 补充按分类匹配到的源
        categories = self.load_source_categories()
        for source in sources:
            if topic_id in categories.get(source.id, []) and source.id not in {s.id for s in matched}:
                matched.append(source)

        if max_sources is None:
            max_sources = topic.max_sources

        # 复制一份再打乱，避免修改原列表顺序
        sampled = matched[:]
        random.shuffle(sampled)
        return sampled[:max_sources]


topic_service = TopicService()
