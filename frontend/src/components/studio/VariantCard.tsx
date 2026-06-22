import { useState } from "react";
import type { ContentVariant } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformLabels, platformIcons } from "@/lib/utils";
import { Check, Copy, Image, Clock, Bot, FileText, Type } from "lucide-react";

interface VariantCardProps {
  variant: ContentVariant;
  usedLlm?: boolean;
}

function countChineseChars(text: string): number {
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (text.match(/[a-zA-Z0-9]+/g) || []).length;
  return cn + en;
}

export function VariantCard({ variant, usedLlm }: VariantCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${variant.title}\n\n${variant.body}\n\n${variant.tags.map((tag) => `#${tag}`).join(" ")}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const wordCount = countChineseChars(variant.body);

  return (
    <Card className="grid h-full grid-rows-[auto_1fr] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {platformIcons[variant.platform]}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base">
                {platformLabels[variant.platform]}
              </CardTitle>
              <CardDescription className="line-clamp-1">
                {variant.title}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={usedLlm ? "default" : "secondary"} className="gap-1 text-[10px]">
              {usedLlm ? (
                <>
                  <Bot size={10} />
                  LLM
                </>
              ) : (
                <>
                  <FileText size={10} />
                  模板
                </>
              )}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7 shrink-0"
              aria-label="复制文案"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 grid-rows-[1fr_auto_auto] gap-3 overflow-hidden pt-0">
        <div className="h-full min-h-0 overflow-auto rounded-md border bg-muted/30 p-3">
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {variant.body}
          </div>
        </div>
        {variant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variant.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {variant.estimated_read && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {variant.estimated_read}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Type size={12} />
            约 {wordCount} 字
          </span>
          {variant.image_prompt && (
            <span className="flex items-center gap-1">
              <Image size={12} />
              已生成配图提示
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
