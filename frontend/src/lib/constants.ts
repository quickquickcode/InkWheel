import type { PlatformId } from "@/types";
import {
  LayoutDashboard,
  TrendingUp,
  PenTool,
  Send,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type ViewId =
  | "dashboard"
  | "trends"
  | "studio"
  | "publishing"
  | "logs";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "仪表盘",
    icon: LayoutDashboard,
    description: "工作流概览与关键指标",
  },
  {
    id: "trends",
    label: "趋势洞察",
    icon: TrendingUp,
    description: "热点采集与源站筛选",
  },
  {
    id: "studio",
    label: "内容工作室",
    icon: PenTool,
    description: "文章分析与多平台生成",
  },
  {
    id: "publishing",
    label: "发布管理",
    icon: Send,
    description: "平台适配器与发布执行",
  },
  {
    id: "logs",
    label: "运行日志",
    icon: ScrollText,
    description: "任务与事件记录",
  },
];

export type StageId = "gather" | "read" | "compose" | "publish";

export interface WorkflowStage {
  id: StageId;
  step: number;
  title: string;
  description: string;
}

export const workflowStages: WorkflowStage[] = [
  {
    id: "gather",
    step: 1,
    title: "趋势采集",
    description: "从公开榜单与 RSS 源抓取热点",
  },
  {
    id: "read",
    step: 2,
    title: "文章阅读",
    description: "选择资料并由 AI 分析要点",
  },
  {
    id: "compose",
    step: 3,
    title: "内容生成",
    description: "生成小红书/头条/公众号版本",
  },
  {
    id: "publish",
    step: 4,
    title: "发布管理",
    description: "预览载荷并执行安全发布",
  },
];

export const platforms: { id: PlatformId; name: string; color: string; icon: string }[] = [
  { id: "xiaohongshu", name: "小红书", color: "#f43f5e", icon: "🔴" },
  { id: "toutiao", name: "今日头条", color: "#dc2626", icon: "🔵" },
  { id: "wechat", name: "微信公众号", color: "#22c55e", icon: "🟢" },
];

export const platformOrder: PlatformId[] = ["xiaohongshu", "toutiao", "wechat"];
