import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import type { JobEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Loader2,
  AlertTriangle,
  XCircle,
  Info,
  ScrollText,
} from "lucide-react";

type FilterKey = "all" | "rss_collect" | "generate" | "analyze" | "preview" | "execute_preview" | "account" | "system";

interface FilterItem {
  key: FilterKey;
  label: string;
  kinds: JobEvent["kind"][];
}

const filters: FilterItem[] = [
  { key: "all", label: "全部", kinds: [] },
  { key: "rss_collect", label: "采集", kinds: ["rss_collect"] },
  { key: "generate", label: "生成", kinds: ["generate"] },
  { key: "analyze", label: "分析", kinds: ["analyze"] },
  { key: "preview", label: "预览", kinds: ["preview"] },
  { key: "execute_preview", label: "发布", kinds: ["execute_preview"] },
  { key: "account", label: "账号", kinds: ["account"] },
  { key: "system", label: "系统", kinds: ["system", "sync"] },
];

const statusConfig = {
  success: { icon: CheckCircle, className: "text-green-500", label: "成功" },
  running: { icon: Loader2, className: "text-blue-500 animate-spin", label: "运行中" },
  warning: { icon: AlertTriangle, className: "text-amber-500", label: "警告" },
  error: { icon: XCircle, className: "text-destructive", label: "错误" },
  info: { icon: Info, className: "text-slate-500", label: "信息" },
};

const kindVariant: Record<JobEvent["kind"], "default" | "secondary" | "outline" | "destructive"> = {
  rss_collect: "default",
  generate: "secondary",
  analyze: "outline",
  preview: "default",
  execute_preview: "destructive",
  account: "secondary",
  sync: "outline",
  system: "outline",
};

export function LogsView() {
  const { jobs } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedJob, setSelectedJob] = useState<JobEvent | undefined>();

  const filteredJobs =
    activeFilter === "all"
      ? jobs
      : jobs.filter((job) => filters.find((f) => f.key === activeFilter)?.kinds.includes(job.kind));

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">运行日志</h2>
        <p className="text-xs text-muted-foreground">任务与事件完整记录</p>
      </div>

      <Card className="flex flex-1 flex-col">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText size={16} className="text-muted-foreground" />
                事件列表
              </CardTitle>
              <CardDescription>共 {filteredJobs.length} 条记录</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <ScrollArea className="h-[calc(100%-1rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">时间</TableHead>
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="hidden md:table-cell">摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      暂无日志记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => {
                    const config = statusConfig[job.status];
                    const Icon = config.icon;
                    return (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{formatTime(job.created_at)}</div>
                          <div className="text-[10px]">{relativeTime(job.created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={kindVariant[job.kind]} className="text-[10px]">
                            {job.kind}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{job.title}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Icon size={14} className={config.className} />
                            <span>{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {job.message}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedJob && (
                <>
                  {(() => {
                    const Config = statusConfig[selectedJob.status];
                    const Icon = Config.icon;
                    return <Icon size={18} className={Config.className} />;
                  })()}
                  {selectedJob.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedJob && (
                <span className="flex items-center gap-2">
                  <Badge variant={selectedJob ? kindVariant[selectedJob.kind] : "outline"}>
                    {selectedJob.kind}
                  </Badge>
                  <span>{formatTime(selectedJob.created_at)}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">消息内容</p>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap">{selectedJob.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">事件 ID</span>
                  <p className="mt-0.5 font-mono">{selectedJob.id}</p>
                </div>
                <div>
                  <span className="font-medium">状态</span>
                  <p className="mt-0.5">{statusConfig[selectedJob.status].label}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
