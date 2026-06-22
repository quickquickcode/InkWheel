from __future__ import annotations

import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Optional
from xml.etree import ElementTree

import feedparser
import httpx
from bs4 import BeautifulSoup

from app.core.config import Settings, get_settings
from app.models.schemas import ArticleItem, RssSource, TopicConfig
from app.services.jobs import JobStatus, ProgressTracker
from app.services.topics import topic_service
from app.storage.repository import utc_now


def _clean_html(html: str) -> dict[str, Any]:
    """把 RSS 里的 HTML 清洗成纯文本，并提取图片。"""
    if not html:
        return {"text": "", "html": "", "images": []}

    soup = BeautifulSoup(html, "lxml")

    # 移除 script/style
    for tag in soup(["script", "style", "noscript", "iframe"]):
        tag.decompose()

    # 提取图片
    images: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if src and src.startswith("http"):
            images.append(src)

    # 块级标签前加换行，方便阅读
    for tag in soup.find_all(["p", "br", "div", "h1", "h2", "h3", "h4", "li", "hr"]):
        if tag.name in ("br", "hr"):
            tag.replace_with("\n")
        else:
            tag.append("\n")

    text = soup.get_text(separator="", strip=False)
    # 合并多余空行
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    return {"text": text, "html": html, "images": images[:10]}


def _sha_id(*parts: str) -> str:
    text = "|".join(parts).encode("utf-8")
    return hashlib.sha1(text).hexdigest()[:12]


def _parse_opml(path: Path) -> list[RssSource]:
    tree = ElementTree.parse(path)
    root = tree.getroot()
    sources: list[RssSource] = []
    for outline in root.iter("outline"):
        xml_url = outline.get("xmlUrl")
        if not xml_url:
            continue
        title = outline.get("title") or outline.get("text") or "未命名"
        source_id = _sha_id(title, xml_url)
        sources.append(
            RssSource(
                id=source_id,
                name=title,
                xml_url=xml_url,
                html_url=outline.get("htmlUrl"),
                enabled=True,
            )
        )
    return sources


def _entry_to_article(entry: dict, source: RssSource) -> Optional[ArticleItem]:
    title_raw = (entry.get("title") or "").strip()
    # 有些 RSS 源的 title 也带 HTML 标签，需要清洗
    title = _clean_html(title_raw)["text"] or title_raw
    link = entry.get("link") or ""
    if not title:
        return None

    published_at: Optional[str] = None
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            dt = datetime(*parsed[:6], tzinfo=timezone.utc)
            published_at = dt.isoformat()
        except Exception:
            pass

    summary = entry.get("summary") or entry.get("description") or ""
    content = ""
    if "content" in entry and entry["content"]:
        content = entry["content"][0].get("value", "")
    if not content:
        content = summary

    cleaned = _clean_html(content)
    text = cleaned["text"]
    # summary 始终用纯文本且更短
    plain_summary = _clean_html(summary)["text"][:300] if summary else (text[:300] if text else "")

    article_id = _sha_id(source.id, title, link)
    return ArticleItem(
        id=article_id,
        title=title,
        source=source.name,
        source_id=source.id,
        url=link,
        summary=plain_summary,
        content=text[:2000],
        content_text=text[:3000],
        content_html=cleaned["html"][:4000],
        images=cleaned["images"],
        published_at=published_at,
        collected_at=utc_now(),
    )


def _within_days(published_at: Optional[str], days: int) -> bool:
    if not published_at:
        return True
    try:
        dt = datetime.fromisoformat(published_at)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return dt >= cutoff
    except Exception:
        return True


def _fetch_feed(source: RssSource, settings: Settings) -> list[ArticleItem]:
    try:
        with httpx.Client(timeout=settings.rss_timeout_seconds, follow_redirects=True) as client:
            response = client.get(source.xml_url)
            response.raise_for_status()
    except Exception as exc:
        return []

    try:
        parsed = feedparser.parse(response.content)
    except Exception:
        return []

    articles: list[ArticleItem] = []
    for entry in parsed.entries:
        article = _entry_to_article(entry, source)
        if article:
            articles.append(article)
    return articles


class RssService:
    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._sources: Optional[list[RssSource]] = None

    def load_sources(self) -> list[RssSource]:
        if self._sources is None:
            self._sources = topic_service.enrich_sources(_parse_opml(self.settings.opml_path))
        return self._sources

    def _collect_sources(
        self,
        selected: list[RssSource],
        keywords: list[str],
        days: int,
        limit: int,
        settings: Settings,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[list[ArticleItem], list[RssSource], str]:
        articles: list[ArticleItem] = []
        fetched_source_ids: set[str] = set()
        processed = 0

        if progress:
            progress.update(
                status=JobStatus.running,
                message=f"开始并发采集 {len(selected)} 个 RSS 源...",
                total=len(selected),
                current=0,
            )

        def _fetch_with_progress(source: RssSource) -> list[ArticleItem]:
            nonlocal processed
            result = _fetch_feed(source, settings)
            processed += 1
            if progress:
                progress.update(
                    current=processed,
                    message=f"已处理 {processed}/{len(selected)} 个源，累计 {len(articles) + len(result)} 篇文章",
                    detail={
                        "current_source": source.name,
                        "current_source_articles": len(result),
                        "collected_articles": len(articles) + len(result),
                    },
                )
            return result

        with ThreadPoolExecutor(max_workers=settings.rss_max_workers) as executor:
            future_to_source = {
                executor.submit(_fetch_with_progress, source): source
                for source in selected
            }
            for future in as_completed(future_to_source):
                source = future_to_source[future]
                try:
                    source_articles = future.result()
                except Exception:
                    source_articles = []
                if source_articles:
                    fetched_source_ids.add(source.id)
                articles.extend(source_articles)

        if progress:
            progress.update(
                message=f"采集完成，正在过滤 {len(articles)} 篇原始文章...",
                detail={"collected_articles": len(articles)},
            )

        # 按时间倒序，过滤最近 N 天
        articles = [a for a in articles if _within_days(a.published_at, days)]
        articles.sort(key=lambda a: a.published_at or "", reverse=True)

        if keywords:
            keyword_lowers = [k.lower() for k in keywords if k.strip()]
            filtered: list[ArticleItem] = []
            for a in articles:
                text = (a.title or "") + " " + (a.summary or "")
                text_lower = text.lower()
                if any(kw in text_lower for kw in keyword_lowers):
                    filtered.append(a)
            articles = filtered

        articles = articles[:limit]

        # 更新源站元数据
        now = utc_now()
        for source in selected:
            source.last_fetched_at = now
            source.article_count = len([a for a in articles if a.source_id == source.id])

        reason = f"从 {len(fetched_source_ids)}/{len(selected)} 个 RSS 源采集到 {len(articles)} 篇文章。"
        return articles, selected, reason

    def collect(
        self,
        source_ids: list[str],
        keyword: Optional[str],
        days: int,
        limit: int,
    ) -> tuple[list[ArticleItem], list[RssSource], str]:
        all_sources = self.load_sources()
        selected = all_sources
        if source_ids:
            selected = [s for s in all_sources if s.id in source_ids]

        keywords = [keyword] if keyword else []
        return self._collect_sources(selected, keywords, days, limit, self.settings)

    def collect_by_topic(
        self,
        topic_id: str,
        keyword: Optional[str] = None,
        days: Optional[int] = None,
        limit: Optional[int] = None,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[list[ArticleItem], list[RssSource], TopicConfig, str]:
        topic = topic_service.get_topic(topic_id)
        if not topic:
            raise ValueError(f"未知话题: {topic_id}")

        all_sources = self.load_sources()
        selected = topic_service.sources_for_topic(all_sources, topic_id)

        # 构造临时 settings，使用话题级别超时与并发
        override = Settings()
        override.rss_timeout_seconds = topic.rss_timeout_seconds
        override.rss_max_workers = topic.rss_max_workers

        # 话题采集默认不过滤关键词（由排行榜用 keywords 打分），
        # 仅当用户额外输入关键词时才做过滤。
        keywords = [keyword] if keyword else []
        articles, sources, reason = self._collect_sources(
            selected,
            keywords,
            days or topic.days,
            limit or topic.limit,
            override,
            progress=progress,
        )

        for article in articles:
            article.topic_id = topic_id

        if progress:
            progress.update(
                status=JobStatus.completed,
                message=f"【{topic.name}】采集完成，共 {len(articles)} 篇文章",
                percent=100,
                detail={
                    "topic_id": topic.id,
                    "topic_name": topic.name,
                    "collected_articles": len(articles),
                    "sources": len(selected),
                    "success_sources": len({a.source_id for a in articles}),
                },
            )

        return articles, sources, topic, reason


rss_service = RssService()
