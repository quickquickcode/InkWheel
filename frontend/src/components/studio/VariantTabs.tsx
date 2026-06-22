import { useState } from "react";
import type { ContentVariant, PlatformId, PostDraft } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VariantCard } from "./VariantCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { platformLabels, platformIcons } from "@/lib/utils";
import { platformOrder } from "@/lib/constants";
import { Check, Copy, FileText } from "lucide-react";

interface VariantTabsProps {
  post?: PostDraft;
  usedLlm?: boolean;
}

export function VariantTabs({ post, usedLlm }: VariantTabsProps) {
  const [activeTab, setActiveTab] = useState<PlatformId>("xiaohongshu");
  const [copied, setCopied] = useState(false);

  const activeVariant = post?.variants.find((variant) => variant.platform === activeTab);

  const handleCopyCurrent = async () => {
    if (!activeVariant) return;
    const text = `${activeVariant.title}\n\n${activeVariant.body}\n\n${activeVariant.tags.map((tag) => `#${tag}`).join(" ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!post) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
          <FileText size={32} className="mb-2 text-muted-foreground/60" />
          生成内容后将在此展示多平台版本
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{post.source_title}</h3>
          <p className="text-xs text-muted-foreground">
            {post.variants.length} 个平台版本 · {formatTime(post.created_at)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyCurrent}
          disabled={!activeVariant}
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          复制当前版本
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PlatformId)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="grid w-full grid-cols-3">
          {platformOrder.map((platform) => (
            <TabsTrigger key={platform} value={platform} className="text-xs">
              <span className="mr-1">{platformIcons[platform]}</span>
              {platformLabels[platform]}
            </TabsTrigger>
          ))}
        </TabsList>
        {platformOrder.map((platform) => {
          const variant = post.variants.find((v) => v.platform === platform);
          return (
            <TabsContent key={platform} value={platform} className="h-full flex flex-col overflow-hidden">
              {variant ? (
                <VariantCard variant={variant} usedLlm={usedLlm} />
              ) : (
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    暂无 {platformLabels[platform]} 版本
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
