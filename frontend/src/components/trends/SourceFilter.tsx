import type { RssSource } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Rss } from "lucide-react";

interface SourceFilterProps {
  rssSources: RssSource[];
}

export function SourceFilter({ rssSources }: SourceFilterProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">源站筛选</CardTitle>
            <CardDescription>当前启用的 RSS 数据源</CardDescription>
          </div>
          <Rss size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rssSources.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无 RSS 源</p>
          )}
          {rssSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{source.name}</div>
                <div className="text-xs text-muted-foreground">
                  {source.categories.join(" · ") || "综合"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {source.article_count}
                </Badge>
                <Switch checked={source.enabled} disabled aria-readonly />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
