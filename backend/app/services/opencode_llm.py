from __future__ import annotations

import json
import shutil
import subprocess
from typing import Optional

from app.models.schemas import LLMUsage
from app.services.llm import LLMError


class OpencodeRunClient:
    """调用本地 opencode CLI 的 `run` 命令，使用其内置免费模型。

    输出格式为 JSON Lines，包含 step_start / text / step_finish 等事件。
    本客户端从 `type=text` 事件中拼接模型返回文本，从 `type=step_finish`
    中读取 token/cost 信息。
    """

    def __init__(self) -> None:
        self._binary: Optional[str] = shutil.which("opencode")
        self.model = "opencode-run-free"

    def available(self) -> bool:
        return self._binary is not None

    def chat(self, prompt: str, temperature: float = 0.7) -> tuple[str, LLMUsage]:
        if not self._binary:
            raise LLMError("未找到 opencode 命令，请先安装 opencode CLI")

        # opencode run 目前不支持 temperature 参数，但保留接口统一
        cmd = [
            self._binary,
            "run",
            prompt,
            "--format",
            "json",
            "--title",
            "cyberlab-task",
        ]

        try:
            completed = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180,
            )
        except subprocess.TimeoutExpired as exc:
            raise LLMError(f"opencode run 执行超时: {exc}") from exc
        except FileNotFoundError as exc:
            raise LLMError(f"opencode 命令不可用: {exc}") from exc
        except Exception as exc:
            raise LLMError(f"opencode run 调用失败: {exc}") from exc

        if completed.returncode != 0:
            stderr = completed.stderr.strip() if completed.stderr else ""
            raise LLMError(f"opencode run 返回非零退出码: {stderr}")

        text_parts: list[str] = []
        usage = LLMUsage(model="opencode-run-free")

        for line in completed.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")
            part = event.get("part", {})

            if event_type == "text":
                text_parts.append(part.get("text", ""))
            elif event_type == "step_finish":
                tokens = part.get("tokens", {})
                usage.prompt_tokens = tokens.get("input", 0)
                usage.completion_tokens = tokens.get("output", 0)
                # opencode run 目前 cost 为 0，保留字段

        full_text = "".join(text_parts)
        if not full_text.strip():
            raise LLMError("opencode run 未返回有效文本")

        return full_text, usage


