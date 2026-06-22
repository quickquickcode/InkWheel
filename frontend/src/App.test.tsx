import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { DashboardState } from "./types";

const postVariants = [
  {
    platform: "xiaohongshu" as const,
    title: "教育智能体实践小红书版",
    body: "小红书正文",
    tags: ["AI", "教育"],
    image_prompt: null,
    estimated_read: "2 分钟",
    version: 1,
  },
  {
    platform: "toutiao" as const,
    title: "教育智能体实践｜微头条",
    body: "【今日观察】教育智能体正在进入真实课堂。",
    tags: ["AI教育", "智能体"],
    image_prompt: null,
    estimated_read: "微头条 120 字",
    version: 1,
  },
  {
    platform: "wechat" as const,
    title: "教育智能体实践公众号版",
    body: "公众号正文",
    tags: ["AI", "教育"],
    image_prompt: null,
    estimated_read: "5 分钟",
    version: 1,
  },
];

const dashboard: DashboardState = {
  topics: [
    {
      id: "ai-llm",
      name: "AI 与大模型",
      description: "大模型、Agent、AI 工具",
      icon: "sparkles",
      keywords: ["AI", "大模型"],
      days: 7,
      limit: 20,
      max_sources: 20,
      rss_timeout_seconds: 8,
      rss_max_workers: 3,
    },
  ],
  articles: [
    {
      id: "article_1",
      title: "AI 智能体在教育场景的应用实践",
      source: "Hacker News",
      source_id: "rss_hackernews",
      url: "https://example.com/article",
      summary: "关于 AI 智能体在教育场景的应用实践文章摘要。",
      content: null,
      published_at: "2026-06-15T10:00:00.000Z",
      collected_at: "2026-06-15T12:00:00.000Z",
      topic_id: "ai-llm",
      score: 0,
      rank: 1,
    },
  ],
  rss_sources: [
    {
      id: "rss_hackernews",
      name: "Hacker News",
      xml_url: "https://news.ycombinator.com/rss",
      enabled: true,
      article_count: 1,
      categories: ["ai-llm"],
    },
  ],
  posts: [
    {
      id: "post_article_1",
      source_id: "article_1",
      source_title: "AI 智能体在教育场景的应用实践",
      source_kind: "article",
      status: "generated",
      variants: postVariants,
      created_at: "2026-06-15T13:00:00.000Z",
    },
  ],
  accounts: [
    {
      platform: "toutiao",
      label: "默认头条账号",
      status: "unknown",
      cookie_path: null,
      last_checked_at: null,
      notes: "测试账号",
    },
  ],
  adapters: [
    {
      platform: "xiaohongshu",
      label: "小红书",
      mode: "not_connected",
      connected: false,
      state: "not_connected",
      account: "未授权",
      capability: "图文/视频发布预览",
      next_step: "后续连接 XiaohongshuSkills。",
    },
    {
      platform: "toutiao",
      label: "今日头条",
      mode: "preview",
      connected: true,
      state: "preview_ready",
      account: "student_01",
      capability: "微头条/文章发布预览",
      next_step: "后续接入 MCP。",
    },
    {
      platform: "wechat",
      label: "微信公众号",
      mode: "draft_only",
      connected: false,
      state: "draft_only",
      account: "未绑定公众号",
      capability: "Markdown 草稿生成",
      next_step: "后续接入 wemp。",
    },
  ],
  jobs: [
    {
      id: "job_system_boot",
      kind: "system",
      title: "系统通知",
      message: "控制台已就绪。",
      status: "info",
      created_at: "2026-06-01T00:00:00.000Z",
    },
  ],
  repos: [],
};

describe("App ink workspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const path = typeof url === "string" ? url : url.pathname;
        if (path.includes("/api/dashboard")) {
          return new Response(JSON.stringify(dashboard), { status: 200 });
        }
        if (path.includes("/api/rankings")) {
          return new Response(
            JSON.stringify({
              topic: dashboard.topics[0],
              items: [
                {
                  article: dashboard.articles[0],
                  score: {
                    article_id: dashboard.articles[0].id,
                    topic_id: dashboard.topics[0].id,
                    relevance_score: 0.8,
                    recency_score: 1.0,
                    source_weight: 0.5,
                    hot_score: 0.85,
                    rank: 1,
                    reason: "测试",
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (path.includes("/api/rss/collect-by-topic-async") || path.includes("/api/content/generate-async") || path.includes("/api/content/generate-fused-async")) {
          return new Response(JSON.stringify({ job_id: "job_test_1", title: "测试任务", status: "completed" }), { status: 200 });
        }
        if (path.includes("/api/articles/")) {
          return new Response(JSON.stringify(dashboard.articles[0]), { status: 200 });
        }
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }),
    );
    vi.stubGlobal(
      "EventSource",
      class MockEventSource {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage(new MessageEvent("message", { data: JSON.stringify({ status: "completed" }) }));
            }
          }, 0);
        }
        close() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the new single-surface workflow", async () => {
    render(<App />);

    expect(await screen.findByText("POP CONTENT LAB")).toBeInTheDocument();
    expect(screen.getByText("AI 与大模型 热榜")).toBeInTheDocument();
    expect(screen.getByText("文章预览")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /内容生成/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发布管理/ })).toBeInTheDocument();
    expect(screen.getAllByText("AI 智能体在教育场景的应用实践").length).toBeGreaterThan(0);
  });

  it("can select an article and see generate actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText("POP CONTENT LAB")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /AI 智能体在教育场景的应用实践/ }));

    expect(screen.getByRole("button", { name: /生成内容/ })).toBeInTheDocument();
  });

  it("shows a clear Toutiao account and micro-post publish path", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("POP CONTENT LAB");
    await user.click(screen.getByRole("button", { name: /发布管理/ }));

    expect(screen.getByLabelText("待发布文案")).toBeInTheDocument();

    await user.click(screen.getByTestId("publish-adapter-toutiao"));

    expect(screen.getByText("今日头条账号")).toBeInTheDocument();
    expect(screen.getAllByText("教育智能体实践｜微头条").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /打开浏览器发微头条/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI教育 智能体")).toBeInTheDocument();
  });
});
