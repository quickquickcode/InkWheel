import type { RssSource } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Rss } from "lucide-react";

interface SourceFilterProps {
  rssSources: RssSource[];
}

export function SourceFilter({ rssSources }: SourceFilterProps) {
  return (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">源站筛选</CardTitle>
          <Rss size={14} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-1.5">
          {rssSources.length === 0 && (
            <p className="text-xs text-muted-foreground">暂无 RSS 源</p>
          )}
          {rssSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{source.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {source.categories.join(" · ") || "综合"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {source.article_count}
                </span>
                <Switch
                  checked={source.enabled}
                  disabled
                  aria-readonly
                  className="scale-75"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
