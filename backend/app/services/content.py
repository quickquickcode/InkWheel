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
        full_text = source.content_text or source.content or source.summary or ""
        # 模板兜底也尽量使用完整内容，保证长度和质量
        summary = full_text[:600] if len(full_text) > 600 else full_text
        src = getattr(source, "source", "网络")

        if platform == PlatformId.xiaohongshu:
            emojis = _emoji_for(source.title)
            return ContentVariant(
                platform=platform,
                title=source.title[:22],
                body=(
                    f"{emojis}\n\n"
                    f"刚看到这条消息：{source.title}\n\n"
                    "简单概括一下这件事的核心：\n"
                    f"{summary[:220]}\n\n"
                    "这件事为什么值得关注？\n"
                    "• 它反映了行业正在发生的重要变化\n"
                    "• 对相关从业者和普通读者都有参考价值\n"
                    "• 后续发展可能会影响更多领域\n\n"
                    "我自己的看法是：这种变化不是孤立的，把它和最近的同类事件放在一起看，能发现更明显的趋势信号。\n\n"
                    "大家觉得这件事后续会怎么发展？会在哪些场景落地？评论区聊聊 👇\n\n"
                    f"{' '.join('#' + tag for tag in tags)}"
                ),
                tags=tags,
                image_prompt=f"高清封面图，现代科技感，主题：{source.title}",
                estimated_read="350 字",
            )
        if platform == PlatformId.toutiao:
            return ContentVariant(
                platform=platform,
                title=f"{source.title}｜热点观察",
                body=(
                    f"【今日观察】{source.title}\n\n"
                    f"{summary[:300]}\n\n"
                    f"来源：{src}。这件事值得关注，原因有三：\n"
                    "一是事件本身的影响面正在扩大，已经超出单一平台或单一公司的范畴；"
                    "二是相关行业可能因此被重新估值，产业链上下游都会受到波及；"
                    "三是普通读者也能从中看到趋势信号，提前判断自己该关注什么、该做什么。\n\n"
                    "进一步看，这件事不是孤立事件。把它放到近半年的行业脉络里，能发现几个共同特征："
                    "技术迭代在加速、开源与闭源的博弈在加剧、普通用户获取先进能力的门槛在降低。\n\n"
                    "对于从业者来说，需要回答两个问题：这个变化对自己的业务有没有直接冲击？"
                    "如果有，应该在哪个节点切入？对于普通读者来说，更重要的是建立判断框架："
                    "先看事实，再辨信号，最后结合自身场景做决策。\n\n"
                    "你怎么看？欢迎在评论区留下观点，一起交流。"
                ),
                tags=tags,
                estimated_read="微头条 450 字",
            )
        return ContentVariant(
            platform=platform,
            title=source.title,
            body=(
                "---\n"
                f"title: {source.title}\n"
                f"digest: {summary[:80]}\n"
                "author: InkWheel\n"
                "---\n\n"
                f"# {source.title}\n\n"
                "## 热点背景\n\n"
                f"{summary[:350]}\n\n"
                f"来源：{src}\n\n"
                "## 核心看点\n\n"
                "### 1. 事件本身的直接意义\n\n"
                f"{source.title} 的发布/出现，标志着相关领域进入了一个新的阶段。"
                "对于长期关注这一方向的读者来说，这既是技术进步的验证，也是竞争格局变化的信号。\n\n"
                "### 2. 对行业的连锁影响\n\n"
                "任何单一事件都不会独立存在。这件事可能带来三重连锁反应："
                "一是技术路线的分化与收敛，二是商业模式的重新定价，三是用户习惯的潜移默化。\n\n"
                "### 3. 值得持续跟踪的节点\n\n"
                "接下来可以重点关注：后续是否有更多玩家跟进、是否有实际落地案例、"
                "以及监管和舆论层面是否会带来新的变量。\n\n"
                "## 深度解读\n\n"
                "把这件事放到更大的时间轴上看，它其实是过去一两年行业演化的一个切片。"
                "技术侧的快速迭代与商业侧的谨慎落地形成鲜明对比，这种张力本身就意味着机会和风险并存。\n\n"
                "对于内容创作者和运营者来说，真正的价值不在于追逐每一条热点，"
                "而在于建立一套稳定的判断框架：识别信号、评估影响、选择角度、持续输出。\n\n"
                "## 对读者的价值\n\n"
                "无论你是从业者还是普通关注者，都可以从这条消息中提炼出可复用的认知："
                "先看事实，再辨信号，最后结合自身场景做决策。"
                "保持对关键变量的敏感，比追逐每一次波动更重要。\n\n"
                "---\n\n"
                "*本文由 InkWheel 基于公开资料整理生成，仅供参考。*"
            ),
            tags=tags,
            image_prompt=f"公众号头图，简洁大气，主题：{source.title}",
            estimated_read="5 分钟",
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
            (getattr(s, "content_text", None) or getattr(s, "content", "") or getattr(s, "summary", "") or "")[:300]
            for s in sources
        ]
        idea = user_prompt or "围绕热点资料输出跨平台内容"
        src_names = ", ".join({getattr(s, "source", "网络") for s in sources})

        variants: list[ContentVariant] = []
        for platform in platforms:
            if platform == PlatformId.xiaohongshu:
                emojis = _emoji_for(sources[0].title)
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title[:16]}等 {len(sources)} 条热点观察",
                        body=(
                            f"{emojis}\n\n"
                            f"综合 {len(sources)} 条消息，聊聊最近在关注的一个方向：\n\n"
                            + "\n".join(f"• {t}" for t in titles[:4])
                            + f"\n\n把这些信息串起来看，能发现几个共同点：\n"
                            "• 这件事不是孤立事件，背后有更大的趋势在推\n"
                            "• 不同来源交叉验证后，可信度更高\n"
                            "• 对普通读者和从业者都有参考价值\n\n"
                            f"{idea}\n\n"
                            "有在关注这方面的朋友吗？你觉得接下来会怎么发展？一起交流 👇\n\n"
                            f"{' '.join('#' + tag for tag in tags)}"
                        ),
                        tags=tags,
                        image_prompt=f"融合热点封面图，主题：{sources[0].title}",
                        estimated_read="400 字",
                    )
                )
            elif platform == PlatformId.toutiao:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title}｜{len(sources)} 源融合观察",
                        body=(
                            f"【融合观察】基于 {len(sources)} 条消息（{src_names}）：\n\n"
                            + "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles[:4]))
                            + "\n\n把多方信息放在一起，能发现单一消息看不到的脉络：\n"
                            "第一，事件本身的影响面正在扩大；\n"
                            "第二，不同信源交叉验证后，核心事实更可靠；\n"
                            "第三，这件事和近期的同类事件形成呼应，说明趋势在加速。\n\n"
                            f"{idea}\n\n"
                            "这件事还在发酵，值得持续跟踪。你怎么看？欢迎在评论区留下观点。"
                        ),
                        tags=tags,
                        estimated_read="微头条 500 字",
                    )
                )
            else:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{sources[0].title}：{len(sources)} 源交叉解读",
                        body=(
                            "---\n"
                            f"title: {sources[0].title}：{len(sources)} 源交叉解读\n"
                            f"digest: 基于 {len(sources)} 条消息的跨平台内容整理，提炼共同信号与独立判断。\n"
                            "author: InkWheel\n"
                            "---\n\n"
                            "# 消息来源\n\n"
                            + "\n".join(f"- {t}" for t in titles[:4])
                            + f"\n\n来源：{src_names}\n\n"
                            "# 核心观察\n\n"
                            f"{idea}\n\n"
                            "# 交叉验证后的三个判断\n\n"
                            "1. **事件可信度较高**：多源报道指向同一事实，核心信息已经过交叉验证。\n"
                            "2. **影响面超出单一平台**：这件事的意义不仅在于事件本身，更在于它释放的行业信号。\n"
                            "3. **趋势在加速**：和近半年的同类事件对比，能发现技术/商业/舆论层面的共同推进力量。\n\n"
                            "# 对读者的价值\n\n"
                            "对于内容创作者和运营者来说，这类多源事件最适合用来做深度解读；"
                            "对于普通读者来说，建立「多源交叉 + 趋势判断」的框架，比追逐单条热点更有价值。\n\n"
                            "---\n\n"
                            "*本文由 InkWheel 基于公开资料整理生成，仅供参考。*"
                        ),
                        tags=tags,
                        image_prompt=f"公众号头图，主题：{sources[0].title}",
                        estimated_read="5 分钟",
                    )
                )

        return PostDraft(
            id=f"post_fused_{sources[0].id}_{uuid4().hex[:8]}",
            source_id=sources[0].id,
            source_title=f"融合生成（{len(sources)} 篇资料）",
            source_kind="fused",
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
