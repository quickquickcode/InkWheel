from __future__ import annotations

import asyncio
import json
import shlex
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ApiStatus,
    AsyncJobStatus,
    ClearContentResponse,
    DashboardState,
    ExecutePreviewRequest,
    ExecutePreviewResponse,
    GenerateAsyncRequest,
    GenerateAsyncResponse,
    GenerateFusedAsyncResponse,
    GenerateFusedRequest,
    GenerateFusedResponse,
    GenerateRequest,
    GenerateResponse,
    JobKind,
    JobProgressData,
    PlatformAccount,
    PlatformId,
    PreviewRequest,
    PreviewResponse,
    RankingResponse,
    RssCollectRequest,
    RssCollectResponse,
    TopicCollectAsyncRequest,
    TopicCollectAsyncResponse,
    TopicCollectRequest,
    TopicCollectResponse,
    ToutiaoAccountResponse,
    ToutiaoAccountUpdateRequest,
    ToutiaoLoginResponse,
    ToutiaoMicroPublishRequest,
    ToutiaoMicroPublishResponse,
)
from app.adapters.toutiao import ToutiaoAdapter
from app.services.adapters import adapter_registry
from app.services.content import content_service
from app.services.github_sync import GithubSyncService
from app.services.jobs import JobStatus, job_store, run_in_thread
from app.services.llm import LLMError
from app.services.ranking import ranking_service
from app.services.rss import rss_service
from app.services.topics import topic_service
from app.storage.repository import repo

router = APIRouter()


def _to_progress_data(progress) -> JobProgressData:
    return JobProgressData(
        job_id=progress.job_id,
        status=AsyncJobStatus(progress.status.value),
        title=progress.title,
        message=progress.message,
        percent=progress.percent,
        total=progress.total,
        current=progress.current,
        detail=progress.detail,
        result=progress.result,
        error=progress.error,
        created_at=progress.created_at,
        updated_at=progress.updated_at,
    )


@router.get("/status", response_model=ApiStatus)
def status() -> ApiStatus:
    settings = get_settings()
    return ApiStatus(
        rss_available=settings.rss_available,
        opencode_available=settings.opencode_available,
        topics=topic_service.load_topics(),
        adapters=repo.adapters,
    )


@router.get("/dashboard", response_model=DashboardState)
def dashboard() -> DashboardState:
    return DashboardState(
        topics=topic_service.load_topics(),
        articles=repo.articles,
        rss_sources=repo.rss_sources,
        posts=repo.posts,
        adapters=repo.adapters,
        accounts=getattr(repo, "accounts", []),
        jobs=repo.jobs,
        repos=repo.repos,
    )


@router.post("/admin/clear-content", response_model=ClearContentResponse)
def clear_content() -> ClearContentResponse:
    if not hasattr(repo, "clear_content"):
        raise HTTPException(status_code=500, detail="Repository does not support clearing")
    return ClearContentResponse(ok=True, cleared=repo.clear_content())


def _default_toutiao_account() -> PlatformAccount:
    settings = get_settings()
    cookie_path = (
        settings.project_root
        / "external"
        / "toutiao"
        / "toutiao_cli"
        / "toutiao_cookies.json"
    )
    return PlatformAccount(
        platform=PlatformId.toutiao,
        label="默认头条账号",
        status="unknown",
        cookie_path=str(cookie_path),
        notes="使用今日头条 CLI 的 Cookie 文件。",
    )


def _toutiao_account() -> PlatformAccount:
    if hasattr(repo, "get_account"):
        account = repo.get_account(PlatformId.toutiao)
        if account:
            return account
    return _default_toutiao_account()


def _upsert_toutiao_account(account: PlatformAccount) -> PlatformAccount:
    if hasattr(repo, "upsert_account"):
        return repo.upsert_account(account)
    return account


def _toutiao_adapter():
    adapter = next((item for item in repo.adapters if item.platform == PlatformId.toutiao), None)
    if adapter is None:
        raise HTTPException(status_code=500, detail="Toutiao adapter status missing")
    return adapter


@router.get("/accounts/toutiao", response_model=ToutiaoAccountResponse)
def get_toutiao_account() -> ToutiaoAccountResponse:
    return ToutiaoAccountResponse(account=_toutiao_account(), adapter=_toutiao_adapter())


@router.put("/accounts/toutiao", response_model=ToutiaoAccountResponse)
def update_toutiao_account(request: ToutiaoAccountUpdateRequest) -> ToutiaoAccountResponse:
    account = _toutiao_account().model_copy(
        update={
            "label": request.label.strip() or "默认头条账号",
            "cookie_path": request.cookie_path.strip() if request.cookie_path else None,
            "notes": request.notes,
            "status": "unknown",
            "last_checked_at": None,
        }
    )
    account = _upsert_toutiao_account(account)
    return ToutiaoAccountResponse(account=account, adapter=_toutiao_adapter())


@router.post("/accounts/toutiao/check", response_model=ToutiaoAccountResponse)
def check_toutiao_account() -> ToutiaoAccountResponse:
    account = _toutiao_account()
    settings = get_settings()
    cmd = [
        settings.toutiao_python_bin,
        str(settings.toutiao_cli_script),
        "auth",
        "status",
    ]
    env = {"TOUTIAO_COOKIES_FILE": account.cookie_path} if account.cookie_path else None
    rc, stdout, stderr = ToutiaoAdapter()._run_subprocess(cmd, timeout=30, env=env)
    connected = rc == 0
    message = stdout.strip() or stderr.strip() or ("已登录" if connected else "未登录或 Cookie 已过期")
    event = repo.add_job(
        JobKind.account,
        "今日头条账号检查完成",
        message,
        "success" if connected else "warning",
    )
    account = account.model_copy(
        update={
            "status": "connected" if connected else "not_connected",
            "last_checked_at": event.created_at,
            "notes": message,
        }
    )
    account = _upsert_toutiao_account(account)
    return ToutiaoAccountResponse(account=account, adapter=_toutiao_adapter())


@router.post("/accounts/toutiao/login", response_model=ToutiaoLoginResponse)
def login_toutiao_account() -> ToutiaoLoginResponse:
    account = _toutiao_account()
    settings = get_settings()
    cmd = [
        settings.toutiao_python_bin,
        str(settings.toutiao_cli_script),
        "auth",
        "login",
    ]
    command = " ".join(shlex.quote(part) for part in cmd)
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    tracker = job_store.create(job_id, "打开今日头条登录浏览器", total=1)

    def _run() -> None:
        env = {"TOUTIAO_COOKIES_FILE": account.cookie_path} if account.cookie_path else None
        tracker.update(status=JobStatus.running, message="正在打开可见浏览器，请在头条页面完成扫码/登录...")
        rc, stdout, stderr = ToutiaoAdapter()._run_subprocess(cmd, timeout=660, env=env)
        ok = rc == 0
        message = stdout.strip() or stderr.strip() or ("登录成功" if ok else "登录失败")
        event = repo.add_job(
            JobKind.account,
            "今日头条登录流程结束",
            message,
            "success" if ok else "warning",
        )
        next_account = account.model_copy(
            update={
                "status": "connected" if ok else "not_connected",
                "last_checked_at": event.created_at,
                "notes": message,
            }
        )
        _upsert_toutiao_account(next_account)
        tracker.update(
            status=JobStatus.completed if ok else JobStatus.failed,
            message="登录完成" if ok else "登录失败或超时",
            percent=100,
            current=1,
            result={"stdout": stdout, "stderr": stderr, "account_status": next_account.status},
            error=None if ok else (stderr or stdout),
        )

    run_in_thread(_run)
    return ToutiaoLoginResponse(job_id=job_id, account=account, command=command)


@router.get("/articles")
def list_articles():
    return {"items": repo.articles}


@router.get("/articles/{article_id}")
def get_article(article_id: str):
    article = repo.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/rss/sources")
def list_rss_sources():
    return {"items": rss_service.load_sources()}


@router.get("/topics")
def list_topics():
    return {"items": topic_service.load_topics()}


@router.post("/rss/collect-by-topic", response_model=TopicCollectResponse)
def collect_rss_by_topic(request: TopicCollectRequest) -> TopicCollectResponse:
    articles, sources, topic, reason = rss_service.collect_by_topic(
        topic_id=request.topic_id,
        keyword=request.keyword,
        days=request.days,
        limit=request.limit,
    )
    repo.replace_articles(articles)
    repo.replace_rss_sources(sources)
    job = repo.add_job(
        JobKind.rss_collect,
        f"【{topic.name}】采集完成：{len(articles)} 篇文章",
        reason,
        "success" if articles else "warning",
    )
    return TopicCollectResponse(
        topic=topic,
        items=repo.articles,
        sources=repo.rss_sources,
        job=job,
    )


@router.post("/rss/collect-by-topic-async", response_model=TopicCollectAsyncResponse)
def collect_rss_by_topic_async(
    request: TopicCollectAsyncRequest, background_tasks: BackgroundTasks
) -> TopicCollectAsyncResponse:
    topic = topic_service.get_topic(request.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    title = f"【{topic.name}】RSS 采集"
    tracker = job_store.create(job_id, title, total=0)

    def _run() -> None:
        try:
            tracker.update(status=JobStatus.running, message="正在筛选 RSS 源...")
            articles, sources, _, reason = rss_service.collect_by_topic(
                topic_id=request.topic_id,
                keyword=request.keyword,
                days=request.days,
                limit=request.limit,
                progress=tracker,
            )
            repo.replace_articles(articles)
            repo.replace_rss_sources(sources)
            repo.add_job(
                JobKind.rss_collect,
                f"【{topic.name}】采集完成：{len(articles)} 篇文章",
                reason,
                "success" if articles else "warning",
            )
            tracker.update(
                status=JobStatus.completed,
                message=f"采集完成，共 {len(articles)} 篇文章",
                result={
                    "topic_id": request.topic_id,
                    "article_count": len(articles),
                    "source_count": len(sources),
                },
            )
        except Exception as exc:
            tracker.update(
                status=JobStatus.failed,
                message=f"采集失败：{exc}",
                error=str(exc),
            )

    run_in_thread(_run)
    return TopicCollectAsyncResponse(
        job_id=job_id, title=title, status=AsyncJobStatus(tracker.get_progress().status.value)
    )


@router.get("/rankings", response_model=RankingResponse)
def get_rankings(topic_id: str, limit: int = 10) -> RankingResponse:
    topic = topic_service.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    items = ranking_service.rank(repo.articles, topic_id, limit=limit)
    return RankingResponse(topic=topic, items=items)


@router.post("/rss/collect", response_model=RssCollectResponse)
def collect_rss(request: RssCollectRequest) -> RssCollectResponse:
    articles, sources, reason = rss_service.collect(
        source_ids=request.source_ids,
        keyword=request.keyword,
        days=request.days,
        limit=request.limit,
    )
    repo.replace_articles(articles)
    repo.replace_rss_sources(sources)
    job = repo.add_job(
        JobKind.rss_collect,
        f"RSS 采集完成：{len(articles)} 篇文章",
        reason,
        "success" if articles else "warning",
    )
    return RssCollectResponse(
        items=repo.articles,
        sources=repo.rss_sources,
        job=job,
    )


@router.post("/content/analyze", response_model=AnalyzeResponse)
def analyze_article(request: AnalyzeRequest) -> AnalyzeResponse:
    article = repo.get_article(request.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    # 同步前端选择的话题到文章（若文章尚未绑定）
    if request.topic_id and not article.topic_id:
        article.topic_id = request.topic_id
    try:
        analysis, usage = content_service.analyze(article, topic_id=request.topic_id)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    job = repo.add_job(
        JobKind.analyze,
        "文章分析完成",
        f"《{article.title}》由 {usage.model} 分析完成。",
    )
    return AnalyzeResponse(analysis=analysis, usage=usage, job=job)


@router.post("/content/generate", response_model=GenerateResponse)
def generate_content(request: GenerateRequest) -> GenerateResponse:
    source = repo.get_article(request.article_id)

    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # 同步前端选择的话题到文章（若文章尚未绑定）
    if request.topic_id and not source.topic_id:
        source.topic_id = request.topic_id

    try:
        post, used_llm = content_service.generate(
            source,
            request.platforms,
            use_llm=request.use_llm,
            topic_id=request.topic_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    repo.add_post(post)
    usage = None
    message = f"已基于《{source.title}》生成 {len(post.variants)} 个平台版本。"
    if used_llm:
        message = f"已使用 LLM 基于《{source.title}》生成 {len(post.variants)} 个平台版本。"
    job = repo.add_job(
        JobKind.generate,
        "内容生成完成",
        message,
        "success",
    )
    return GenerateResponse(post=post, job=job, usage=usage)


@router.post("/content/generate-async", response_model=GenerateAsyncResponse)
def generate_content_async(
    request: GenerateAsyncRequest, background_tasks: BackgroundTasks
) -> GenerateAsyncResponse:
    source = repo.get_article(request.article_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if request.topic_id and not source.topic_id:
        source.topic_id = request.topic_id

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    title = f"生成《{source.title}》多平台内容"
    tracker = job_store.create(job_id, title, total=len(request.platforms))

    def _run() -> None:
        try:
            tracker.update(status=JobStatus.running, message="开始生成内容...")
            post, used_llm = content_service.generate(
                source,
                request.platforms,
                use_llm=request.use_llm,
                topic_id=request.topic_id,
                progress=tracker,
            )
            repo.add_post(post)
            repo.add_job(
                JobKind.generate,
                "内容生成完成",
                f"已基于《{source.title}》生成 {len(post.variants)} 个平台版本。",
                "success",
            )
            tracker.update(
                status=JobStatus.completed,
                message="内容生成完成",
                result={
                    "post_id": post.id,
                    "platforms": [v.platform.value for v in post.variants],
                    "used_llm": used_llm,
                },
            )
        except Exception as exc:
            tracker.update(
                status=JobStatus.failed,
                message=f"生成失败：{exc}",
                error=str(exc),
            )

    run_in_thread(_run)
    return GenerateAsyncResponse(
        job_id=job_id, title=title, status=AsyncJobStatus(tracker.get_progress().status.value)
    )


@router.post("/content/generate-fused", response_model=GenerateFusedResponse)
def generate_fused_content(request: GenerateFusedRequest) -> GenerateFusedResponse:
    sources = [repo.get_article(aid) for aid in request.article_ids]
    missing = [aid for aid, src in zip(request.article_ids, sources) if src is None]
    if missing:
        raise HTTPException(status_code=404, detail=f"Articles not found: {', '.join(missing)}")

    try:
        post, used_llm = content_service.generate_fused(
            sources,
            request.platforms,
            use_llm=request.use_llm,
            topic_id=request.topic_id,
            user_prompt=request.user_prompt,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    repo.add_post(post)
    usage = None
    message = f"已基于 {len(sources)} 篇资料融合生成 {len(post.variants)} 个平台版本。"
    if used_llm:
        message = f"已使用 LLM 基于 {len(sources)} 篇资料融合生成 {len(post.variants)} 个平台版本。"
    job = repo.add_job(
        JobKind.generate,
        "融合内容生成完成",
        message,
        "success",
    )
    return GenerateFusedResponse(post=post, job=job, usage=usage)


@router.post("/content/generate-fused-async", response_model=GenerateFusedAsyncResponse)
def generate_fused_content_async(
    request: GenerateFusedRequest, background_tasks: BackgroundTasks
) -> GenerateFusedAsyncResponse:
    sources = [repo.get_article(aid) for aid in request.article_ids]
    missing = [aid for aid, src in zip(request.article_ids, sources) if src is None]
    if missing:
        raise HTTPException(status_code=404, detail=f"Articles not found: {', '.join(missing)}")

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    title = f"融合生成 {len(sources)} 篇资料"
    tracker = job_store.create(job_id, title, total=len(request.platforms))

    def _run() -> None:
        try:
            tracker.update(status=JobStatus.running, message="开始融合生成...")
            post, used_llm = content_service.generate_fused(
                sources,
                request.platforms,
                use_llm=request.use_llm,
                topic_id=request.topic_id,
                user_prompt=request.user_prompt,
                progress=tracker,
            )
            repo.add_post(post)
            repo.add_job(
                JobKind.generate,
                "融合内容生成完成",
                f"已基于 {len(sources)} 篇资料融合生成 {len(post.variants)} 个平台版本。",
                "success",
            )
            tracker.update(
                status=JobStatus.completed,
                message="融合生成完成",
                result={
                    "post_id": post.id,
                    "platforms": [v.platform.value for v in post.variants],
                    "used_llm": used_llm,
                },
            )
        except Exception as exc:
            tracker.update(
                status=JobStatus.failed,
                message=f"融合生成失败：{exc}",
                error=str(exc),
            )

    run_in_thread(_run)
    return GenerateFusedAsyncResponse(
        job_id=job_id, title=title, status=AsyncJobStatus(tracker.get_progress().status.value)
    )


@router.get("/jobs/{job_id}", response_model=JobProgressData)
def get_job(job_id: str) -> JobProgressData:
    tracker = job_store.get(job_id)
    if not tracker:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_progress_data(tracker.get_progress())


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str) -> StreamingResponse:
    tracker = job_store.get(job_id)
    if not tracker:
        raise HTTPException(status_code=404, detail="Job not found")

    async def _event_stream() -> AsyncIterator[str]:
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def _on_update(progress) -> None:
            try:
                loop.call_soon_threadsafe(queue.put_nowait, progress)
            except Exception:
                pass

        tracker.on_update(_on_update)

        # 让 EventSource 在连接断开后不要自动重连（24 小时等于不重连）
        yield "retry: 86400000\n\n"

        try:
            while True:
                try:
                    progress = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    progress = tracker.get_progress()

                data = _to_progress_data(progress).model_dump_json()
                yield f"data: {data}\n\n"

                if progress.status in (
                    JobStatus.completed,
                    JobStatus.failed,
                    JobStatus.cancelled,
                ):
                    break
        finally:
            tracker.clear_event()

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/posts")
def list_posts():
    return {"items": repo.posts}


@router.post("/publish/preview", response_model=PreviewResponse)
def preview_publish(request: PreviewRequest) -> PreviewResponse:
    post = repo.get_post(request.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post draft not found")
    try:
        preview = adapter_registry.preview(request.platform, post)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if hasattr(repo, "update_adapter_statuses"):
        repo.update_adapter_statuses(request.platform)
    job = repo.add_job(
        JobKind.preview,
        "发布预览就绪",
        f"{request.platform.value} 已生成预览载荷，未触发真实发布。",
    )
    return PreviewResponse(preview=preview, job=job, adapters=repo.adapters)


@router.post("/publish/execute-preview", response_model=ExecutePreviewResponse)
def execute_preview(request: ExecutePreviewRequest) -> ExecutePreviewResponse:
    post = repo.get_post(request.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post draft not found")
    try:
        result = adapter_registry.execute_preview(
            request.platform, post, dry_run=request.dry_run
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    job = repo.add_job(
        JobKind.execute_preview,
        f"{request.platform.value} 外部工具执行{'（干跑）' if request.dry_run else ''}",
        result.message,
        "success" if result.ok else "error",
    )
    if result.ok and hasattr(repo, "update_adapter_statuses"):
        repo.update_adapter_statuses(request.platform)
    return ExecutePreviewResponse(result=result, job=job, adapters=repo.adapters)


@router.post("/publish/toutiao/micro", response_model=ToutiaoMicroPublishResponse)
def publish_toutiao_micro(request: ToutiaoMicroPublishRequest) -> ToutiaoMicroPublishResponse:
    post = repo.get_post(request.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post draft not found")

    account = _toutiao_account()
    adapter = ToutiaoAdapter()
    variant = next((item for item in post.variants if item.platform == PlatformId.toutiao), None)
    if not variant:
        raise HTTPException(status_code=400, detail="Post draft does not include Toutiao variant")

    artifact_path = adapter.write_micro_artifact(post)
    topic = request.topic or " ".join(variant.tags[:2])
    command = adapter.micro_command(artifact_path, [topic] if topic else [])
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    tracker = job_store.create(job_id, f"今日头条微头条发布准备：{variant.title[:24]}", total=1)

    def _run() -> None:
        settings = get_settings()
        cmd = [
            settings.toutiao_python_bin,
            str(settings.toutiao_cli_script),
            "micro",
            "publish",
            "--file",
            str(artifact_path),
        ]
        if topic:
            cmd.extend(["--topic", topic])
        env = {"TOUTIAO_COOKIES_FILE": account.cookie_path} if account.cookie_path else None
        tracker.update(status=JobStatus.running, message="正在打开今日头条微头条发布页，等待浏览器填充内容...")
        rc, stdout, stderr = adapter._run_subprocess(cmd, timeout=360, env=env)
        ok = rc == 0
        result = {
            "command": " ".join(shlex.quote(part) for part in cmd),
            "stdout": stdout,
            "stderr": stderr,
            "artifact_path": str(artifact_path),
        }
        repo.add_job(
            JobKind.execute_preview,
            "今日头条微头条发布准备完成" if ok else "今日头条微头条发布准备失败",
            (
                "浏览器已打开并填入微头条内容，请用户在页面内检查并点击发布。"
                if ok
                else stderr or stdout or "外部 CLI 执行失败"
            ),
            "success" if ok else "error",
        )
        if ok and hasattr(repo, "update_adapter_statuses"):
            repo.update_adapter_statuses(PlatformId.toutiao)
        tracker.update(
            status=JobStatus.completed if ok else JobStatus.failed,
            message="浏览器已填入内容，等待人工确认发布" if ok else "微头条浏览器准备失败",
            percent=100,
            current=1,
            result=result,
            error=None if ok else (stderr or stdout),
        )

    run_in_thread(_run)
    return ToutiaoMicroPublishResponse(
        job_id=job_id,
        title=f"今日头条微头条发布准备：{variant.title}",
        status=AsyncJobStatus(tracker.get_progress().status.value),
        command=command,
        artifact_path=str(artifact_path),
    )


@router.get("/jobs")
def list_jobs():
    return {"items": repo.jobs}


@router.get("/external-repos")
def list_external_repos():
    svc = GithubSyncService()
    repos = svc.status_all()
    repo.replace_repos(repos)
    return {"items": repos}


@router.post("/external-repos/sync")
def sync_external_repos(payload: dict):
    name = payload.get("name")
    svc = GithubSyncService()
    repos = svc.status_all()
    repo.replace_repos(repos)
    target = next((r for r in repos if r.name == name), None)
    if not target:
        raise HTTPException(status_code=404, detail="Repository not found")
    result = svc.pull(target.path)
    repo.replace_repos(svc.status_all())
    return {"repo": result}
