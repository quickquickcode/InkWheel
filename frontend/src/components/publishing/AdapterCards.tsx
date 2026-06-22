import type { AdapterStatus } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { platformLabels, platformIcons } from "@/lib/utils";
import { User, ArrowRight } from "lucide-react";

interface AdapterCardsProps {
  adapters: AdapterStatus[];
}

const modeLabels: Record<AdapterStatus["mode"], string> = {
  preview: "预览模式",
  draft_only: "草稿模式",
  not_connected: "未连接",
};

const stateVariant: Record<
  AdapterStatus["state"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  not_connected: "secondary",
  preview_ready: "default",
  draft_only: "outline",
};

export function AdapterCards({ adapters }: AdapterCardsProps) {
  return (
    <Card className="col-span-8">
      <CardHeader>
        <CardTitle className="text-base">平台适配器</CardTitle>
        <CardDescription>各平台连接状态与发布能力</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adapters.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              暂无适配器数据
            </p>
          ) : (
            adapters.map((adapter) => (
              <Card key={adapter.platform} className="border bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{platformIcons[adapter.platform]}</span>
                      <CardTitle className="text-sm">
                        {platformLabels[adapter.platform]}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={adapter.connected ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {adapter.connected ? "已连接" : "未连接"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {adapter.label}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">模式</span>
                    <Badge
                      variant={stateVariant[adapter.state]}
                      className="text-[10px]"
                    >
                      {modeLabels[adapter.mode]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">能力</span>
                    <span className="font-medium">{adapter.capability}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User size={12} />
                    <span>{adapter.account || "—"}</span>
                  </div>
                  <div className="flex items-start gap-1 text-muted-foreground">
                    <ArrowRight size={12} className="mt-0.5 shrink-0" />
                    <span>{adapter.next_step}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
