import { useState } from "react";
import type { JobEvent } from "@/types";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";
import {
  CheckCircle,
  Loader2,
  AlertTriangle,
  XCircle,
  Info,
  ScrollText,
} from "lucide-react";

interface LogPanelProps {
  jobs: JobEvent[];
  limit?: number;
}

const statusConfig = {
  success: { icon: CheckCircle, className: "text-green-500" },
  running: { icon: Loader2, className: "text-blue-500 animate-spin" },
  warning: { icon: AlertTriangle, className: "text-amber-500" },
  error: { icon: XCircle, className: "text-destructive" },
  info: { icon: Info, className: "text-slate-500" },
};

export function LogPanel({ jobs, limit = 10 }: LogPanelProps) {
  const { setCurrentView } = useAppStore();
  const recent = jobs.slice(0, limit);

  return (
    <Card className="col-span-4 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">运行日志</CardTitle>
            <CardDescription>最近 {limit} 条事件</CardDescription>
          </div>
          <ScrollText size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[240px]">
          <div className="space-y-3 pr-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无运行日志</p>
            ) : (
              recent.map((job) => {
                const config = statusConfig[job.status];
                const Icon = config.icon;
                return (
                  <div key={job.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 shrink-0">
                      <Icon size={14} className={config.className} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{job.title}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {job.kind}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {job.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTime(job.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <button
          type="button"
          onClick={() => setCurrentView("logs")}
          className="w-full rounded-md border px-3 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          查看完整日志
        </button>
      </CardFooter>
    </Card>
  );
}
