from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Optional, Protocol
from uuid import uuid4

import httpx

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ArticleAnalysis,
    ArticleItem,
    ContentVariant,
    LLMUsage,
    PlatformId,
    PostDraft,
)
from app.services.jobs import JobStatus, ProgressTracker
from app.storage.repository import utc_now


class LLMError(Exception):
    pass


class ChatClient(Protocol):
    """统一的 LLM 客户端协议，支持 OpenCode HTTP API 与 opencode run CLI。"""

    model: str

    def chat(self, prompt: str, temperature: float = 0.7) -> tuple[str, LLMUsage]:
        ...


def platform_label(platform: PlatformId) -> str:
    labels = {
        PlatformId.xiaohongshu: "小红书",
        PlatformId.toutiao: "今日头条",
        PlatformId.wechat: "微信公众号",
    }
    return labels.get(platform, platform.value)


def _load_prompt(name: str, topic_id: Optional[str] = None) -> str:
    """加载提示词。若提供 topic_id，优先读取 prompts/topics/{topic_id}/{name}.txt，
    不存在则回退到默认 prompts/{name}.txt。"""
    base = Path(__file__).resolve().parents[1] / "prompts"
    if topic_id:
        topic_path = base / "topics" / topic_id / f"{name}.txt"
        if topic_path.exists():
            return topic_path.read_text(encoding="utf-8")
    path = base / f"{name}.txt"
    return path.read_text(encoding="utf-8")


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        match = re.search(r"```(?:json)?\n(.*?)\n```", text, re.DOTALL)
        if match:
            text = match.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        # 尝试从文本中抓第一个 { ... } 块
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise LLMError(f"无法解析 LLM 输出为 JSON: {exc}") from exc


class OpenCodeClient:
    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self.model = self.settings.opencode_model

    def chat(self, prompt: str, temperature: float = 0.7) -> tuple[str, LLMUsage]:
        if not self.settings.opencode_api_key:
            raise LLMError("未配置 OPENCODE_API_KEY")

        payload = {
            "model": self.settings.opencode_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        try:
            response = httpx.post(
                f"{self.settings.opencode_base_url}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.settings.opencode_api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self.settings.opencode_timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMError(f"OpenCode 请求失败: {exc}") from exc

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"OpenCode 响应格式异常: {exc}") from exc

        usage_data = data.get("usage") or {}
        usage = LLMUsage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            model=self.settings.opencode_model,
        )
        return content, usage


class LLMContentGenerator:
    def __init__(self, client: Optional[ChatClient] = None) -> None:
        self.client = client or OpenCodeClient()

    def analyze(
        self, article: ArticleItem, topic_id: Optional[str] = None
    ) -> tuple[ArticleAnalysis, LLMUsage]:
        # 若文章已绑定话题且未显式传入，使用文章话题
        effective_topic = topic_id or article.topic_id
        raw_summary = article.summary or article.content or ""
        # 截断避免 prompt 过长导致 opencode run 变慢
        summary = raw_summary[:800] if len(raw_summary) > 800 else raw_summary
        prompt = _load_prompt("analyze_article", topic_id=effective_topic).format(
            title=article.title,
            source=article.source,
            summary=summary,
        )
        content, usage = self.client.chat(prompt, temperature=0.3)
        data = _extract_json(content)

        suitable = data.get("suitable_platforms", [])
        platforms: list[PlatformId] = []
        for platform_name in suitable:
            try:
                platforms.append(PlatformId(platform_name))
            except ValueError:
                continue

        analysis = ArticleAnalysis(
            article_id=article.id,
            summary=data.get("summary", ""),
            tags=data.get("tags", []),
            key_points=data.get("key_points", []),
            audience=data.get("audience", ""),
            suitable_platforms=platforms,
            tone=data.get("tone", ""),
            model=usage.model,
        )
        return analysis, usage

    def _generate_variant(
        self,
        platform: PlatformId,
        title: str,
        summary: str,
        topic_id: Optional[str],
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[ContentVariant, LLMUsage]:
        if progress:
            progress.update(
                message=f"正在生成 {platform_label(platform)} 版本...",
                detail={"current_platform": platform.value},
            )

        prompt_name = f"generate_{platform.value}"
        prompt = _load_prompt(prompt_name, topic_id=topic_id).format(title=title, summary=summary)
        content, usage = self.client.chat(prompt, temperature=0.7)
        data = _extract_json(content)

        tags = data.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]

        variant = ContentVariant(
            platform=platform,
            title=data.get("title", title),
            body=data.get("body", data.get("content", "")),
            tags=tags,
            image_prompt=data.get("image_prompt"),
            estimated_read="LLM 生成",
        )

        if progress:
            progress.update(
                message=f"{platform_label(platform)} 版本生成完成",
                detail={"completed_platform": platform.value},
            )
        return variant, usage

    def generate(
        self,
        source: ArticleItem,
        platforms: list[PlatformId],
        topic_id: Optional[str] = None,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[PostDraft, LLMUsage]:
        effective_topic = topic_id or source.topic_id
        title = source.title
        raw_summary = getattr(source, "summary", None) or getattr(source, "content", "") or ""
        summary = raw_summary[:800] if len(raw_summary) > 800 else raw_summary
        source_id = source.id
        source_kind = "article"

        if progress:
            progress.update(
                status=JobStatus.running,
                message=f"开始为《{title[:30]}》生成 {len(platforms)} 个平台版本...",
                total=len(platforms),
                current=0,
            )

        total_usage = LLMUsage(model=self.client.model)

        # 并发为各平台生成内容，显著降低总耗时
        with ThreadPoolExecutor(max_workers=min(len(platforms), 4)) as executor:
            futures = [
                executor.submit(
                    self._generate_variant, platform, title, summary, effective_topic, progress
                )
                for platform in platforms
            ]
            results = [f.result() for f in futures]

        variants: list[ContentVariant] = []
        completed = 0
        for variant, usage in results:
            variants.append(variant)
            total_usage.prompt_tokens += usage.prompt_tokens
            total_usage.completion_tokens += usage.completion_tokens
            completed += 1
            if progress:
                progress.update(current=completed)

        # 保持传入的平台顺序
        variants.sort(key=lambda v: platforms.index(v.platform))

        post_id = f"post_{source_id}_{uuid4().hex[:8]}"
        post = PostDraft(
            id=post_id,
            source_id=source_id,
            source_title=title,
            source_kind=source_kind,
            variants=variants,
            created_at=utc_now(),
        )

        if progress:
            progress.update(
                status=JobStatus.completed,
                message="三平台内容生成完成",
                percent=100,
                result={"post_id": post.id, "platforms": [v.platform.value for v in variants]},
            )

        return post, total_usage

    def generate_fused(
        self,
        sources: list[ArticleItem],
        platforms: list[PlatformId],
        topic_id: Optional[str] = None,
        user_prompt: Optional[str] = None,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[PostDraft, LLMUsage]:
        if not sources:
            raise LLMError("融合生成至少需要一篇资料")

        if progress:
            progress.update(
                status=JobStatus.running,
                message=f"正在融合 {len(sources)} 篇资料生成内容...",
                total=len(platforms),
                current=0,
            )

        sources_text = "\n\n".join(
            f"{idx}. 《{s.title}》\n来源：{getattr(s, 'source', '未知')}\n摘要：{getattr(s, 'summary', '') or getattr(s, 'content', '')[:300]}"
            for idx, s in enumerate(sources, 1)
        )
        prompt = _load_prompt("generate_fused", topic_id=topic_id).format(
            sources=sources_text,
            user_prompt=user_prompt or "请基于以上参考资料生成适合各平台发布的内容版本。",
        )
        content, usage = self.client.chat(prompt, temperature=0.7)
        data = _extract_json(content)

        if not isinstance(data, list):
            raise LLMError("融合生成返回格式异常：应为 JSON 数组")

        variants: list[ContentVariant] = []
        for item in data:
            try:
                platform = PlatformId(item["platform"])
            except (KeyError, ValueError):
                continue
            if platform not in platforms:
                continue
            tags = item.get("tags", [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",") if t.strip()]
            variant = ContentVariant(
                platform=platform,
                title=item.get("title", sources[0].title),
                body=item.get("body", item.get("content", "")),
                tags=tags,
                image_prompt=item.get("image_prompt"),
                estimated_read="LLM 融合生成",
            )
            variants.append(variant)

        # 保持传入的平台顺序
        variants.sort(key=lambda v: platforms.index(v.platform))

        missing = [p for p in platforms if not any(v.platform == p for v in variants)]
        if missing:
            raise LLMError(f"融合生成缺少平台：{[p.value for p in missing]}")

        post_id = f"post_fused_{sources[0].id}_{uuid4().hex[:8]}"
        post = PostDraft(
            id=post_id,
            source_id=sources[0].id,
            source_title=f"融合生成（{len(sources)} 篇资料）",
            source_kind="article",
            variants=variants,
            created_at=utc_now(),
        )

        if progress:
            progress.update(
                status=JobStatus.completed,
                message="融合生成完成",
                percent=100,
                current=len(platforms),
                result={"post_id": post.id, "platforms": [v.platform.value for v in variants]},
            )

        return post, usage


def _uuid_short() -> str:
    return uuid4().hex
