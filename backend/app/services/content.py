from __future__ import annotations

import re
from abc import ABC, abstractmethod
from uuid import uuid4
from typing import Optional

from app.core.config import get_settings
from app.models.schemas import ArticleItem, ContentVariant, PlatformId, PostDraft
from app.services.jobs import JobStatus, ProgressTracker
from app.services.llm import LLMContentGenerator, LLMError
from app.services.opencode_llm import OpencodeRunClient
from app.storage.repository import utc_now


class ContentGenerator(ABC):
    @abstractmethod
    def generate(
        self,
        source: ArticleItem,
        platforms: list[PlatformId],
    ) -> PostDraft:
        raise NotImplementedError


def _extract_tags(title: str, summary: str = "") -> list[str]:
    """从标题和摘要中提取关键词作为标签，不再使用固定课程实验标签。"""
    text = f"{title} {summary}"
    # 常见科技/AI/商业热点词库
    candidates = [
        "AI", "大模型", "人工智能", "OpenAI", "ChatGPT", "Agent", "智能体",
        "算力", "芯片", "英伟达", "NVIDIA", "苹果", "特斯拉", "新能源",
        "自动驾驶", "机器人", "云计算", "开源", "Python", "开发者",
        "小红书", "抖音", "视频号", "微信", "电商", "直播", "带货",
        "教育", "医疗", "金融", "游戏", "电影", "娱乐", "科技",
        "创业", "投资", "融资", "IPO", "美股", "A股", "宏观经济",
    ]
    found = [kw for kw in candidates if kw.lower() in text.lower() or kw in text]
    # 补充通用标签
    generics = ["热点观察", "今日话题"]
    tags = (found + generics)[:5]
    return tags if tags else generics


def _emoji_for(title: str) -> str:
    """根据标题关键词给小红书配几个 emoji。"""
    mapping = {
        "AI": "🤖",
        "大模型": "🧠",
        "芯片": "💻",
        "英伟达": "🎮",
        "苹果": "🍎",
        "特斯拉": "🚗",
        "新能源": "🔋",
        "自动驾驶": "🚙",
        "机器人": "🦾",
        "开源": "🔓",
        "创业": "🚀",
        "投资": "📈",
        "教育": "📚",
        "医疗": "🏥",
        "游戏": "🎮",
        "电影": "🎬",
        "小红书": "📕",
        "抖音": "🎵",
        "微信": "💬",
        "电商": "🛒",
        "直播": "📺",
        "热点": "🔥",
    }
    emojis = []
    for kw, emoji in mapping.items():
        if kw in title:
            emojis.append(emoji)
        if len(emojis) >= 3:
            break
    if not emojis:
        emojis = ["🔥", "💡", "👀"]
    return " ".join(emojis[:3])


class TemplateContentGenerator(ContentGenerator):
    """LLM 不可用时的兜底生成器，产出可直接发布的真实平台文案。"""

    def generate(
        self,
        source: ArticleItem,
        platforms: list[PlatformId],
    ) -> PostDraft:
        variants = [self._variant_for(platform, source) for platform in platforms]
        return PostDraft(
            id=f"post_{source.id}_{uuid4().hex[:8]}",
            source_id=source.id,
            source_title=source.title,
            source_kind="article",
            variants=variants,
            created_at=utc_now(),
        )

    def _variant_for(
        self, platform: PlatformId, source: ArticleItem
    ) -> ContentVariant:
        tags = _extract_tags(source.title, source.summary or "")
        summary = (source.summary or source.content or source.content_text or "")[:200]
        src = getattr(source, "source", "网络")

        if platform == PlatformId.xiaohongshu:
            emojis = _emoji_for(source.title)
            return ContentVariant(
                platform=platform,
                title=source.title[:22],
                body=(
                    f"{emojis}\n\n"
                    f"刚看到这条消息：{source.title}\n\n"
                    f"{summary}\n\n"
                    "大家觉得这件事后续会怎么发展？评论区聊聊 👇\n\n"
                    f"{' '.join('#' + tag for tag in tags)}"
                ),
                tags=tags,
                image_prompt=f"高清封面图，现代科技感，主题：{source.title}",
                estimated_read="120 字",
            )
        if platform == PlatformId.toutiao:
            return ContentVariant(
                platform=platform,
                title=f"{source.title}｜热点观察",
                body=(
                    f"【今日观察】{source.title}\n\n"
                    f"{summary}\n\n"
                    f"来源：{src}。这件事值得关注，原因有三："
                    "一是事件本身影响面正在扩大，二是相关行业可能因此被重新估值，"
                    "三是普通读者也能从中看到趋势信号。\n\n"
                    "你怎么看？欢迎在评论区留下观点。"
                ),
                tags=tags,
                estimated_read="微头条 180 字",
            )
        return ContentVariant(
            platform=platform,
            title=source.title,
            body=(
                "---\n"
                f"title: {source.title}\n"
                f"digest: {summary}\n"
                "author: InkWheel\n"
                "---\n\n"
                f"# {source.title}\n\n"
                "## 热点背景\n\n"
                f"{summary}\n\n"
                f"来源：{src}\n\n"
                "## 核心观点\n\n"
                f"{source.title} 反映出当前行业正在经历一轮重要变化。"
                "对于关注这一领域的读者来说，需要把握两个关键点："
                "事件本身的直接意义，以及它可能带来的连锁反应。\n\n"
                "## 对读者的价值\n\n"
                "无论你是从业者还是普通关注者，都可以从这条消息中提炼出可复用的判断框架："
                "先看事实，再辨信号，最后结合自身场景做决策。\n\n"
                "---\n\n"
                "*本文由 InkWheel 基于公开资料整理生成，仅供参考。*"
            ),
            tags=tags,
            image_prompt=f"公众号头图，简洁大气，主题：{source.title}",
            estimated_read="3 分钟",
        )

    def generate_fused(
        self,
        sources: list[ArticleItem],
        platforms: list[PlatformId],
        user_prompt: Optional[str] = None,
    ) -> PostDraft:
        tags = _extract_tags(sources[0].title, sources[0].summary or "")
        titles = [s.title for s in sources]
        summaries = [
            (getattr(s, "summary", None) or getattr(s, "content", "") or "")[:160]
            for s in sources
        ]
        idea = user_prompt or "围绕热点资料输出跨平台内容"

        variants: list[ContentVariant] = []
        for platform in platforms:
            if platform == PlatformId.xiaohongshu:
                emojis = _emoji_for(sources[0].title)
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title[:16]}等热点观察",
                        body=(
                            f"{emojis}\n\n"
                            f"综合 {len(sources)} 条消息，聊聊 {sources[0].title[:16]}：\n\n"
                            + "\n".join(f"• {t}" for t in titles[:4])
                            + f"\n\n{idea}\n\n"
                            "有在关注这方面的朋友吗？一起交流 👇\n\n"
                            f"{' '.join('#' + tag for tag in tags)}"
                        ),
                        tags=tags,
                        image_prompt=f"融合热点封面图，主题：{sources[0].title}",
                        estimated_read="150 字",
                    )
                )
            elif platform == PlatformId.toutiao:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title}｜多源观察",
                        body=(
                            f"【融合观察】基于 {len(sources)} 条消息：\n\n"
                            + "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles[:4]))
                            + f"\n\n{idea}\n\n"
                            "把多方信息放一起看，能发现单一消息看不到的脉络。"
                            "这件事还在发酵，值得持续跟踪。"
                        ),
                        tags=tags,
                        estimated_read="微头条 200 字",
                    )
                )
            else:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title}：多源解读",
                        body=(
                            "---\n"
                            f"title: {sources[0].title}：多源解读\n"
                            f"digest: 基于 {len(sources)} 条消息的跨平台内容整理。\n"
                            "author: InkWheel\n"
                            "---\n\n"
                            "# 消息来源\n\n"
                            + "\n".join(f"- {t}" for t in titles[:4])
                            + f"\n\n# 核心观察\n\n{idea}\n\n"
                            "# 值得关注的原因\n\n"
                            "1. 多源交叉验证，信息可信度更高。\n"
                            "2. 事件影响面可能超出单一平台热度。\n"
                            "3. 对行业判断和日常决策都有参考价值。\n\n"
                            "---\n\n"
                            "*本文由 InkWheel 基于公开资料整理生成，仅供参考。*"
                        ),
                        tags=tags,
                        image_prompt=f"公众号头图，主题：{sources[0].title}",
                        estimated_read="3 分钟",
                    )
                )

        return PostDraft(
            id=f"post_fused_{sources[0].id}_{uuid4().hex[:8]}",
            source_id=sources[0].id,
            source_title=f"融合生成（{len(sources)} 篇资料）",
            source_kind="article",
            variants=variants,
            created_at=utc_now(),
        )


class ContentService:
    def __init__(self) -> None:
        self.template = TemplateContentGenerator()
        self.llm: LLMContentGenerator | None = None

        # 优先使用本地 opencode run CLI（免费模型，无需 API key）
        opencode_client = OpencodeRunClient()
        if opencode_client.available():
            self.llm = LLMContentGenerator(client=opencode_client)
        elif get_settings().opencode_available:
            self.llm = LLMContentGenerator()

    def generate(
        self,
        source: ArticleItem,
        platforms: list[PlatformId],
        use_llm: bool = False,
        topic_id: Optional[str] = None,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[PostDraft, bool]:
        """返回 (PostDraft, 是否使用 LLM)。"""
        if use_llm and self.llm:
            try:
                post, _ = self.llm.generate(
                    source,
                    platforms,
                    topic_id=topic_id or source.topic_id,
                    progress=progress,
                )
                return post, True
            except LLMError:
                pass
        if progress:
            progress.update(
                status=JobStatus.running,
                message="LLM 不可用，使用模板快速生成...",
                total=len(platforms),
                current=0,
            )
        post = self.template.generate(source, platforms)
        if progress:
            progress.update(
                status=JobStatus.completed,
                message="模板生成完成",
                percent=100,
                current=len(platforms),
                result={"post_id": post.id, "platforms": [v.platform.value for v in post.variants]},
            )
        return post, False

    def generate_fused(
        self,
        sources: list[ArticleItem],
        platforms: list[PlatformId],
        use_llm: bool = False,
        topic_id: Optional[str] = None,
        user_prompt: Optional[str] = None,
        progress: Optional[ProgressTracker] = None,
    ) -> tuple[PostDraft, bool]:
        if not sources:
            raise ValueError("融合生成至少需要一篇资料")

        if use_llm and self.llm:
            try:
                post, _ = self.llm.generate_fused(
                    sources,
                    platforms,
                    topic_id=topic_id or sources[0].topic_id,
                    user_prompt=user_prompt,
                    progress=progress,
                )
                return post, True
            except LLMError:
                pass

        if progress:
            progress.update(
                status=JobStatus.running,
                message="LLM 不可用，使用模板融合生成...",
                total=len(platforms),
                current=0,
            )
        post = self.template.generate_fused(sources, platforms, user_prompt=user_prompt)
        if progress:
            progress.update(
                status=JobStatus.completed,
                message="模板融合生成完成",
                percent=100,
                current=len(platforms),
                result={"post_id": post.id, "platforms": [v.platform.value for v in post.variants]},
            )
        return post, False

    def analyze(self, article: ArticleItem, topic_id: Optional[str] = None):
        if not self.llm:
            raise LLMError("LLM 未配置")
        return self.llm.analyze(article, topic_id=topic_id or article.topic_id)


content_service = ContentService()
