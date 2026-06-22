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
import { platformLabels, platformIcons, articleExcerpt } from "@/lib/utils";
import { Check, Copy, Image, Clock } from "lucide-react";

interface VariantCardProps {
  variant: ContentVariant;
}

export function VariantCard({ variant }: VariantCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${variant.title}\n\n${variant.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {platformIcons[variant.platform]}
            </span>
            <div>
              <CardTitle className="text-base">
                {platformLabels[variant.platform]}
              </CardTitle>
              <CardDescription className="line-clamp-1">
                {variant.title}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
            aria-label="复制文案"
          >
            {copied ? (
              <Check size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {articleExcerpt(variant.body, 180)}
        </p>
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
