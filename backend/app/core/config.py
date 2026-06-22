from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[3] / ".env")
except ImportError:
    pass


class Settings:
    project_root: Path = Path(__file__).resolve().parents[3]
    wemp_publish_script: Path = (
        project_root / "external" / "wemp-operator" / "scripts" / "content" / "publish.mjs"
    )
    toutiao_cli_script: Path = (
        project_root / "external" / "toutiao" / "toutiao_cli" / "cli.py"
    )
    xiaohongshu_publish_script: Path = (
        project_root / "external" / "XiaohongshuSkills" / "scripts" / "publish_pipeline.py"
    )
    opml_path: Path = (
        project_root / "backend" / "resources" / "opml" / "bestblogs_wechat2rss_opml_all.opml"
    )
    python_bin: str = "python3"
    toutiao_python_bin: str = os.getenv("TOUTIAO_PYTHON_BIN", "/usr/bin/python3")
    node_bin: str = "node"
    rss_timeout_seconds: int = 15
    rss_max_workers: int = 8

    # OpenCode / OpenAI-compatible LLM settings
    opencode_api_key: str = os.getenv("OPENCODE_API_KEY", "")
    opencode_base_url: str = os.getenv("OPENCODE_BASE_URL", "https://opencode.ai/zen/v1")
    opencode_model: str = os.getenv("OPENCODE_MODEL", "mimo-v2.5-free")
    opencode_timeout_seconds: int = int(os.getenv("OPENCODE_TIMEOUT_SECONDS", "60"))

    @property
    def opencode_available(self) -> bool:
        return bool(self.opencode_api_key)

    @property
    def rss_available(self) -> bool:
        if not self.opml_path.exists():
            return False
        try:
            import xml.etree.ElementTree as ET
            tree = ET.parse(str(self.opml_path))
            root = tree.getroot()
            outlines = root.findall(".//outline[@xmlUrl]")
            return len(outlines) > 0
        except Exception:
            return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
