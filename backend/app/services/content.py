from __future__ import annotations

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


class TemplateContentGenerator(ContentGenerator):
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
        tags = self._tags_for(source)
        pub_time = getattr(source, "published_at", None) or "近期发布"
        src = getattr(source, "source", "网络")

        if platform == PlatformId.xiaohongshu:
            return ContentVariant(
                platform=platform,
                title=f"{source.title[:22]}",
                body=(
                    f"{source.title} 正在成为今天值得观察的内容实验样本。\n\n"
                    "我们可以从三个角度拆解：它为什么突然升温、普通用户会关心什么、"
                    "课程实验里怎样把热点转成可验证的内容方案。\n\n"
                    f"{' '.join('#' + tag for tag in tags)}"
                ),
                tags=tags,
                image_prompt=f"干净的教育科技风封面图，主题：{source.title}",
                estimated_read="86 字",
            )
        if platform == PlatformId.toutiao:
            return ContentVariant(
                platform=platform,
                title=f"{source.title}｜微头条",
                body=(
                    f"【今日观察】{source.title}\n\n"
                    f"来源：{src}，发布时间：{pub_time}。"
                    "这类内容适合作为课堂实验素材：先看事实，再拆受众问题，"
                    "最后用微头条的短评节奏做人工审核与发布确认。"
                ),
                tags=tags,
                estimated_read="微头条 120 字",
            )
        return ContentVariant(
            platform=platform,
            title=f"{source.title}：一次内容运营实验",
            body=(
                "---\n"
                f"title: {source.title}：一次内容运营实验\n"
                f"digest: 从热点采集到多平台预览，拆解 {source.title} 的内容生成流程。\n"
                "author: CyberLab\n"
                "---\n\n"
                f"# {source.title}\n\n"
                "## 1. 文章背景\n"
                f"文章来源：{src}，发布时间：{pub_time}。\n\n"
                "## 2. 可转化角度\n"
                "围绕事实、受众问题和平台表达方式构建内容版本。\n\n"
                "## 3. 实验任务\n"
                "学生需要比较小红书、今日头条、微信公众号三种表达结构的差异。\n"
            ),
            tags=tags,
            image_prompt=f"公众号文章头图，主题：{source.title}",
            estimated_read="3 分钟",
        )

    def _tags_for(self, source: ArticleItem) -> list[str]:
        title = source.title
        src = getattr(source, "source", "")
        base = ["AI教育", "智能体", "内容运营", "课程实验"]
        if "小红书" in title:
            base = ["小红书运营", "平台规则", "内容实验", "热点追踪"]
        elif "开源" in title or src == "Hacker News":
            base = ["开源项目", "技术趋势", "AI工具", "课程实验"]
        return base[:4]

    def generate_fused(
        self,
        sources: list[ArticleItem],
        platforms: list[PlatformId],
        user_prompt: Optional[str] = None,
    ) -> PostDraft:
        tags = self._tags_for(sources[0])
        titles = [s.title for s in sources]
        summaries = [
            (getattr(s, "summary", None) or getattr(s, "content", "") or "")[:200]
            for s in sources
        ]
        idea = user_prompt or "围绕上述资料生成跨平台内容"

        variants: list[ContentVariant] = []
        for platform in platforms:
            if platform == PlatformId.xiaohongshu:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{titles[0][:18]}等 {len(sources)} 篇资料观察",
                        body=(
                            f"综合 {len(sources)} 篇资料，聊聊 {titles[0]} 等话题。\n\n"
                            f"用户想表达：{idea}\n\n"
                            "资料要点：\n"
                            + "\n".join(f"• {t}" for t in titles)
                            + f"\n\n{' '.join('#' + tag for tag in tags)}"
                        ),
                        tags=tags,
                        image_prompt=f"内容融合封面，主题：{titles[0]}",
                        estimated_read="120 字",
                    )
                )
            elif platform == PlatformId.toutiao:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{titles[0]}等 {len(sources)} 篇资料微头条",
                        body=(
                            f"【融合观察】基于 {len(sources)} 篇资料：\n\n"
                            + "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
                            + f"\n\n创作角度：{idea}\n\n"
                            "适合做成微头条短评，先抛趋势，再给判断，最后留给读者讨论。"
                        ),
                        tags=tags,
                        estimated_read="微头条 150 字",
                    )
                )
            else:
                variants.append(
                    ContentVariant(
                        platform=platform,
                        title=f"{titles[0]}：融合内容运营实验",
                        body=(
                            "---\n"
                            f"title: {titles[0]}：融合内容运营实验\n"
                            f"digest: 基于 {len(sources)} 篇资料的跨平台内容生成实验。\n"
                            "author: CyberLab\n"
                            "---\n\n"
                            "# 资料来源\n\n"
                            + "\n".join(f"- {t}" for t in titles)
                            + f"\n\n# 创作意图\n\n{idea}\n\n"
                            "# 实验任务\n\n"
                            "比较小红书、今日头条、微信公众号三种表达结构的差异。\n"
                        ),
                        tags=tags,
                        image_prompt=f"公众号文章头图，主题：{titles[0]}",
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
