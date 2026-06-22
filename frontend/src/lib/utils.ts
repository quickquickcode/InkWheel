import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PlatformId } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDate(date);
}

export function articleExcerpt(text: string | undefined | null, maxLength = 120): string {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

export const platformLabels: Record<PlatformId, string> = {
  xiaohongshu: "小红书",
  toutiao: "今日头条",
  wechat: "微信公众号",
};

export const platformIcons: Record<PlatformId, string> = {
  xiaohongshu: "🔴",
  toutiao: "🔵",
  wechat: "🟢",
};

export const platformColors: Record<PlatformId, string> = {
  xiaohongshu: "bg-rose-500",
  toutiao: "bg-red-600",
  wechat: "bg-green-500",
};

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
