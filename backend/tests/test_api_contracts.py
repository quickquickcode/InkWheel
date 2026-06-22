import time

from app.models.schemas import ArticleItem, PlatformId
from app.services.jobs import job_store
from app.storage.repository import repo


def _seed_article() -> str:
    article = ArticleItem(
        id="seed_article_1",
        title="AI 智能体在教育场景的应用实践",
        source="Hacker News",
        source_id="rss_hackernews",
        collected_at="2026-06-15T12:00:00+00:00",
    )
    repo.articles.append(article)
    return article.id


def test_status_exposes_adapter_contracts(client):
    response = client.get("/api/status")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "InkWheel API"
    assert len(body["adapters"]) == 3
    assert {item["platform"] for item in body["adapters"]} == {
        "xiaohongshu",
        "toutiao",
        "wechat",
    }


def test_generate_content_from_seeded_article(client):
    article_id = _seed_article()
    response = client.post(
        "/api/content/generate",
        json={
            "article_id": article_id,
            "platforms": ["xiaohongshu", "toutiao", "wechat"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["post"]["source_id"] == article_id
    assert body["post"]["source_kind"] == "article"
    assert len(body["post"]["variants"]) == 3
    assert body["job"]["kind"] == "generate"


def test_preview_publish_uses_platform_adapter(client):
    article_id = _seed_article()
    generate_response = client.post(
        "/api/content/generate",
        json={
            "article_id": article_id,
            "platforms": [PlatformId.toutiao.value, PlatformId.wechat.value],
        },
    )
    post_id = generate_response.json()["post"]["id"]

    response = client.post(
        "/api/publish/preview",
        json={"post_id": post_id, "platform": "toutiao"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["preview"]["ok"] is True
    assert body["preview"]["platform"] == "toutiao"
    assert body["preview"]["mode"] == "preview"


def test_toutiao_account_update_and_clear_content(client):
    update_response = client.put(
        "/api/accounts/toutiao",
        json={
            "label": "课堂演示号",
            "cookie_path": "/tmp/toutiao-cookies.json",
            "notes": "测试账号",
        },
    )
    assert update_response.status_code == 200
    body = update_response.json()
    assert body["account"]["label"] == "课堂演示号"
    assert body["account"]["cookie_path"] == "/tmp/toutiao-cookies.json"

    article_id = _seed_article()
    generate_response = client.post(
        "/api/content/generate",
        json={"article_id": article_id, "platforms": ["toutiao"]},
    )
    assert generate_response.status_code == 200

    clear_response = client.post("/api/admin/clear-content")
    assert clear_response.status_code == 200
    cleared = clear_response.json()["cleared"]
    assert cleared["articles"] >= 1
    assert cleared["posts"] >= 1

    dashboard = client.get("/api/dashboard").json()
    assert dashboard["articles"] == []
    assert dashboard["posts"] == []
    assert dashboard["accounts"][0]["platform"] == "toutiao"



def test_collect_by_topic_async_creates_job(client):
    response = client.post(
        "/api/rss/collect-by-topic-async",
        json={"topic_id": "ai-edu"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"].startswith("job_")
    assert body["title"]
    assert body["status"] in ("pending", "running")


def test_generate_content_async_creates_job(client):
    article_id = _seed_article()
    response = client.post(
        "/api/content/generate-async",
        json={
            "article_id": article_id,
            "platforms": ["xiaohongshu"],
            "use_llm": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"].startswith("job_")
    assert body["title"]
    assert body["status"] in ("pending", "running", "completed")


def test_get_job_returns_progress(client):
    article_id = _seed_article()
    create_response = client.post(
        "/api/content/generate-async",
        json={
            "article_id": article_id,
            "platforms": ["xiaohongshu"],
            "use_llm": False,
        },
    )
    job_id = create_response.json()["job_id"]

    for _ in range(20):
        response = client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 200
        body = response.json()
        if body["status"] == "completed":
            break
        time.sleep(0.05)

    assert body["job_id"] == job_id
    assert body["status"] == "completed"
    assert body["percent"] == 100
    assert body["result"]["platforms"] == ["xiaohongshu"]


def test_stream_job_returns_sse_with_terminal_event(client):
    article_id = _seed_article()
    create_response = client.post(
        "/api/content/generate-async",
        json={
            "article_id": article_id,
            "platforms": ["xiaohongshu"],
            "use_llm": False,
        },
    )
    job_id = create_response.json()["job_id"]

    response = client.get(f"/api/jobs/{job_id}/stream")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    text = ""
    for chunk in response.iter_text():
        text += chunk
        if "completed" in text:
            break

    assert "retry:" in text
    assert "data:" in text
    assert "completed" in text

    # 清理回调，避免影响其他测试
    tracker = job_store.get(job_id)
    if tracker:
        tracker._callbacks.clear()


def test_get_article_returns_full_article(client):
    article_id = _seed_article()
    response = client.get(f"/api/articles/{article_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == article_id
    assert body["title"]


def test_generate_fused_from_multiple_articles(client):
    article1 = ArticleItem(
        id="fuse_article_1",
        title="资料一",
        source="Test",
        source_id="rss_test",
        collected_at="2026-06-15T12:00:00+00:00",
    )
    article2 = ArticleItem(
        id="fuse_article_2",
        title="资料二",
        source="Test",
        source_id="rss_test",
        collected_at="2026-06-15T12:00:00+00:00",
    )
    repo.articles.extend([article1, article2])

    response = client.post(
        "/api/content/generate-fused",
        json={
            "article_ids": ["fuse_article_1", "fuse_article_2"],
            "platforms": ["xiaohongshu", "toutiao"],
            "use_llm": False,
            "user_prompt": "比较两篇资料的差异",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["post"]["source_title"].startswith("融合生成")
    assert len(body["post"]["variants"]) == 2
    assert body["job"]["kind"] == "generate"


def test_generate_fused_async_returns_job(client):
    article1 = ArticleItem(
        id="fuse_async_article_1",
        title="资料一",
        source="Test",
        source_id="rss_test",
        collected_at="2026-06-15T12:00:00+00:00",
    )
    repo.articles.append(article1)

    response = client.post(
        "/api/content/generate-fused-async",
        json={
            "article_ids": ["fuse_async_article_1"],
            "platforms": ["wechat"],
            "use_llm": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"].startswith("job_")
    assert body["title"]
    assert body["status"] in ("pending", "running", "completed")
