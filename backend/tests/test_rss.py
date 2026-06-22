import datetime as dt
from pathlib import Path

import pytest

from app.models.schemas import ArticleItem, RssSource
from app.services.rss import RssService


def _feed_xml(title: str, link: str, pub_date: str, summary: str = "") -> bytes:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel><title>Test Feed</title></channel>
  <item>
    <title>{title}</title>
    <link>{link}</link>
    <description>{summary}</description>
    <pubDate>{pub_date}</pubDate>
  </item>
</rss>
""".encode("utf-8")


@pytest.fixture
def fake_opml(tmp_path: Path, monkeypatch) -> Path:
    opml = tmp_path / "test.opml"
    opml.write_text(
        '<?xml version="1.0"?><opml version="1.0"><body>'
        '<outline text="Source A" xmlUrl="https://example.com/a.xml" htmlUrl="https://example.com/a" />'
        '<outline text="Source B" xmlUrl="https://example.com/b.xml" htmlUrl="https://example.com/b" />'
        "</body></opml>",
        encoding="utf-8",
    )
    monkeypatch.setattr("app.services.rss._parse_opml", lambda _p: [
        RssSource(id="src_a", name="Source A", xml_url="https://example.com/a.xml", enabled=True),
        RssSource(id="src_b", name="Source B", xml_url="https://example.com/b.xml", enabled=True),
    ])
    return opml


def test_rss_service_collects_articles(fake_opml, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    pub = now - dt.timedelta(hours=2)
    pub_str = pub.strftime("%a, %d %b %Y %H:%M:%S %Z")

    responses = {
        "https://example.com/a.xml": _feed_xml("Article A", "https://example.com/a1", pub_str, "Summary A"),
        "https://example.com/b.xml": _feed_xml("Article B", "https://example.com/b1", pub_str, "Summary B"),
    }

    class FakeResponse:
        def __init__(self, url: str):
            self.url = url
            self.content = responses[url]

        def raise_for_status(self):
            pass

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        def get(self, url: str, **kwargs):
            return FakeResponse(url)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

    monkeypatch.setattr("app.services.rss.httpx.Client", FakeClient)

    service = RssService()
    monkeypatch.setattr(service.settings, "opml_path", fake_opml)

    articles, sources, reason = service.collect([], None, days=7, limit=10)

    assert len(articles) == 2
    assert all(isinstance(a, ArticleItem) for a in articles)
    assert any(a.title == "Article A" for a in articles)
    assert any(a.title == "Article B" for a in articles)
    assert len(sources) == 2
    assert "采集到 2 篇文章" in reason
