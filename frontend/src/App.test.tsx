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
      content: "关于 AI 智能体在教育场景的应用实践正文内容。",
      published_at: "2026-06-15T10:00:00.000Z",
      collected_at: "2026-06-15T12:00:00.000Z",
      topic_id: "ai-llm",
      score: 0.85,
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

describe("App workspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
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
        if (
          path.includes("/api/rss/collect-by-topic-async") ||
          path.includes("/api/content/generate-async") ||
          path.includes("/api/content/generate-fused-async")
        ) {
          return new Response(
            JSON.stringify({ job_id: "job_test_1", title: "测试任务", status: "completed" }),
            { status: 200 },
          );
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
              this.onmessage(
                new MessageEvent("message", {
                  data: JSON.stringify({ status: "completed" }),
                }),
              );
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

  it("renders the new workspace with dashboard", async () => {
    render(<App />);

    expect(await screen.findByText("InkWheel")).toBeInTheDocument();
    expect(screen.getByText("工作流总览与快捷操作")).toBeInTheDocument();
    expect(screen.getByText("AI 智能体在教育场景的应用实践")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /采集/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^AI 分析$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^生成内容$/ })).toBeInTheDocument();
  });

  it("can navigate to studio and see generate actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("InkWheel");
    await user.click(screen.getAllByRole("button", { name: /^内容工作室$/ })[0]);

    expect(screen.getByText("阅读资料、AI 分析并生成多平台文案")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /单篇生成/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /融合生成/ })).toBeInTheDocument();
  });

  it("shows publishing view with Toutiao account settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("InkWheel");
    await user.click(screen.getAllByRole("button", { name: /^发布管理$/ })[0]);

    expect(screen.getByText("平台适配器状态、预览执行与账号配置")).toBeInTheDocument();
    expect(screen.getByText("发布预览与执行")).toBeInTheDocument();
    expect(screen.getByText("管理今日头条等平台的登录凭据")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /打开浏览器登录/ })).toBeInTheDocument();
  });
});
