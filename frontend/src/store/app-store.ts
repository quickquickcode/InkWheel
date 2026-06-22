import { create } from "zustand";
import type {
  AdapterStatus,
  ArticleAnalysis,
  ArticleItem,
  DashboardState,
  JobEvent,
  PlatformAccount,
  PlatformId,
  PostDraft,
  RankingItem,
  RepoStatus,
  RssSource,
  Toast,
  TopicConfig,
  ViewId,
} from "@/types";

interface AppState {
  // Data
  topics: TopicConfig[];
  articles: ArticleItem[];
  rssSources: RssSource[];
  posts: PostDraft[];
  adapters: AdapterStatus[];
  accounts: PlatformAccount[];
  jobs: JobEvent[];
  repos: RepoStatus[];

  // Selection
  activeTopicId: string;
  selectedArticleId: string | undefined;
  selectedArticleIds: string[];
  activePostId: string | undefined;
  publishPostId: string | undefined;
  activePlatform: PlatformId;

  // Rankings
  rankingItems: RankingItem[];
  keyword: string;

  // Analysis
  analysisByArticleId: Record<string, ArticleAnalysis>;

  // UI
  currentView: ViewId;
  isLoading: boolean;
  useLlm: boolean;
  llmAvailable: boolean;
  usedLlmByPost: Record<string, boolean>;
  toasts: Toast[];
}

interface AppActions {
  setDashboard: (dashboard: DashboardState) => void;
  setTopics: (topics: TopicConfig[]) => void;
  setArticles: (articles: ArticleItem[]) => void;
  setPosts: (posts: PostDraft[]) => void;
  setAdapters: (adapters: AdapterStatus[]) => void;
  setAccounts: (accounts: PlatformAccount[]) => void;
  setJobs: (jobs: JobEvent[]) => void;
  setRepos: (repos: RepoStatus[]) => void;
  prependJob: (job: JobEvent) => void;

  setActiveTopicId: (id: string) => void;
  setSelectedArticleId: (id: string | undefined) => void;
  setSelectedArticle: (article: ArticleItem | undefined) => void;
  toggleArticleSelection: (id: string) => void;
  clearArticleSelection: () => void;
  setActivePostId: (id: string | undefined) => void;
  setPublishPostId: (id: string | undefined) => void;
  setActivePlatform: (platform: PlatformId) => void;

  setRankingItems: (items: RankingItem[]) => void;
  setKeyword: (keyword: string) => void;

  setAnalysis: (articleId: string, analysis: ArticleAnalysis) => void;

  setCurrentView: (view: ViewId) => void;
  setIsLoading: (loading: boolean) => void;
  setUseLlm: (use: boolean) => void;
  toggleUseLlm: () => void;
  setLlmAvailable: (available: boolean) => void;
  setPostUsedLlm: (postId: string, used: boolean) => void;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Helpers
  getSelectedArticle: () => ArticleItem | undefined;
  getActivePost: () => PostDraft | undefined;
  getPublishPost: () => PostDraft | undefined;
  getActiveVariant: () => import("@/types").ContentVariant | undefined;
  getToutiaoAccount: () => PlatformAccount | undefined;
}

const initialState: AppState = {
  topics: [],
  articles: [],
  rssSources: [],
  posts: [],
  adapters: [],
  accounts: [],
  jobs: [],
  repos: [],

  activeTopicId: "",
  selectedArticleId: undefined,
  selectedArticleIds: [],
  activePostId: undefined,
  publishPostId: undefined,
  activePlatform: "xiaohongshu",

  rankingItems: [],
  keyword: "",

  analysisByArticleId: {},

  currentView: "dashboard",
  isLoading: true,
  useLlm: false,
  llmAvailable: false,
  usedLlmByPost: {},
  toasts: [],
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  setDashboard: (dashboard) =>
    set({
      topics: dashboard.topics,
      articles: dashboard.articles,
      rssSources: dashboard.rss_sources,
      posts: dashboard.posts,
      adapters: dashboard.adapters,
      accounts: dashboard.accounts,
      jobs: dashboard.jobs,
      repos: dashboard.repos,
    }),
  setTopics: (topics) => set({ topics }),
  setArticles: (articles) => set({ articles }),
  setPosts: (posts) => set({ posts }),
  setAdapters: (adapters) => set({ adapters }),
  setAccounts: (accounts) => set({ accounts }),
  setJobs: (jobs) => set({ jobs }),
  setRepos: (repos) => set({ repos }),
  prependJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),

  setActiveTopicId: (id) => set({ activeTopicId: id, selectedArticleId: undefined, selectedArticleIds: [] }),
  setSelectedArticleId: (id) => set({ selectedArticleId: id }),
  setSelectedArticle: (article) => set({ selectedArticleId: article?.id }),
  toggleArticleSelection: (id) =>
    set((state) => ({
      selectedArticleIds: state.selectedArticleIds.includes(id)
        ? state.selectedArticleIds.filter((item) => item !== id)
        : [...state.selectedArticleIds, id],
    })),
  clearArticleSelection: () => set({ selectedArticleIds: [] }),
  setActivePostId: (id) => set({ activePostId: id }),
  setPublishPostId: (id) => set({ publishPostId: id }),
  setActivePlatform: (platform) => set({ activePlatform: platform }),

  setRankingItems: (items) => set({ rankingItems: items }),
  setKeyword: (keyword) => set({ keyword }),

  setAnalysis: (articleId, analysis) =>
    set((state) => ({
      analysisByArticleId: { ...state.analysisByArticleId, [articleId]: analysis },
    })),

  setCurrentView: (view) => set({ currentView: view }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setUseLlm: (use) => set({ useLlm: use }),
  toggleUseLlm: () => set((state) => ({ useLlm: !state.useLlm })),
  setLlmAvailable: (available) => set({ llmAvailable: available }),
  setPostUsedLlm: (postId, used) =>
    set((state) => ({
      usedLlmByPost: { ...state.usedLlmByPost, [postId]: used },
    })),

  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  getSelectedArticle: () => {
    const { articles, rankingItems, selectedArticleId } = get();
    if (!selectedArticleId) return undefined;
    const all = new Map<string, ArticleItem>();
    rankingItems.forEach((item) => all.set(item.article.id, item.article));
    articles.forEach((article) => all.set(article.id, article));
    return all.get(selectedArticleId);
  },
  getActivePost: () => {
    const { posts, activePostId } = get();
    return posts.find((post) => post.id === activePostId) ?? posts[0];
  },
  getPublishPost: () => {
    const { posts, publishPostId } = get();
    return posts.find((post) => post.id === publishPostId) ?? posts[0];
  },
  getActiveVariant: () => {
    const { activePlatform } = get();
    const post = get().getActivePost();
    return post?.variants.find((variant) => variant.platform === activePlatform);
  },
  getToutiaoAccount: () => {
    const { accounts } = get();
    return accounts.find((account) => account.platform === "toutiao");
  },
}));
