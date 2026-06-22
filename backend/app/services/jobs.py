from __future__ import annotations

import asyncio
import threading
import time
from enum import Enum
from typing import Any, Callable, Optional

from pydantic import BaseModel

from app.storage.repository import utc_now


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class JobProgress(BaseModel):
    job_id: str
    status: JobStatus
    title: str
    message: str
    percent: int = 0
    total: int = 0
    current: int = 0
    detail: dict[str, Any] = {}
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class ProgressTracker:
    """线程安全的进度追踪器，供异步任务更新状态，SSE 读取。"""

    def __init__(self, job_id: str, title: str, total: int = 0) -> None:
        self.job_id = job_id
        self._lock = threading.Lock()
        self._progress = JobProgress(
            job_id=job_id,
            status=JobStatus.pending,
            title=title,
            message="等待开始",
            percent=0,
            total=total,
            current=0,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        self._callbacks: list[Callable[[JobProgress], None]] = []
        self._event = threading.Event()

    def on_update(self, callback: Callable[[JobProgress], None]) -> None:
        with self._lock:
            self._callbacks.append(callback)
            # 立即推送一次当前状态
            callback(self._progress.model_copy())

    def _notify(self) -> None:
        with self._lock:
            progress = self._progress.model_copy()
            callbacks = self._callbacks[:]
        for cb in callbacks:
            try:
                cb(progress)
            except Exception:
                pass
        self._event.set()

    def update(
        self,
        status: Optional[JobStatus] = None,
        message: Optional[str] = None,
        current: Optional[int] = None,
        total: Optional[int] = None,
        percent: Optional[int] = None,
        detail: Optional[dict[str, Any]] = None,
        result: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> None:
        with self._lock:
            if status:
                self._progress.status = status
            if message is not None:
                self._progress.message = message
            if current is not None:
                self._progress.current = current
            if total is not None:
                self._progress.total = total
            if percent is not None:
                self._progress.percent = percent
            if detail is not None:
                self._progress.detail.update(detail)
            if result is not None:
                self._progress.result = result
            if error is not None:
                self._progress.error = error

            # 自动计算 percent
            if self._progress.total > 0 and percent is None:
                self._progress.percent = min(
                    100, int(100 * self._progress.current / self._progress.total)
                )

            self._progress.updated_at = utc_now()
        self._notify()

    def get_progress(self) -> JobProgress:
        with self._lock:
            return self._progress.model_copy()

    def wait_for_update(self, timeout: Optional[float] = None) -> bool:
        return self._event.wait(timeout=timeout)

    def clear_event(self) -> None:
        self._event.clear()


class AsyncJobStore:
    """内存中的异步任务存储。生产环境可替换为 Redis / 数据库。"""

    def __init__(self) -> None:
        self._jobs: dict[str, ProgressTracker] = {}
        self._lock = threading.Lock()

    def create(self, job_id: str, title: str, total: int = 0) -> ProgressTracker:
        tracker = ProgressTracker(job_id, title, total)
        with self._lock:
            self._jobs[job_id] = tracker
        return tracker

    def get(self, job_id: str) -> Optional[ProgressTracker]:
        with self._lock:
            return self._jobs.get(job_id)

    def remove(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)

    def list_active(self) -> list[str]:
        with self._lock:
            return [
                jid
                for jid, tracker in self._jobs.items()
                if tracker.get_progress().status in (JobStatus.pending, JobStatus.running)
            ]


job_store = AsyncJobStore()


def run_in_thread(target: Callable[..., None], *args: Any, **kwargs: Any) -> None:
    """在后台线程运行目标函数。"""
    thread = threading.Thread(target=target, args=args, kwargs=kwargs, daemon=True)
    thread.start()
