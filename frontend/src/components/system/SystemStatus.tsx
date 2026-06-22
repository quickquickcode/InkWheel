import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, HardDrive, Users, AlertCircle } from "lucide-react";

export function SystemStatus() {
  const { accounts, adapters, repos, jobs } = useAppStore();

  const connectedAdapters = adapters.filter((a) => a.connected).length;
  const connectedAccounts = accounts.filter((a) => a.status === "connected").length;
  const totalAccounts = accounts.length || adapters.length || 0;
  const errorJobs = jobs.filter((j) => j.status === "error").length;
  const dirtyRepos = repos.filter((r) => r.dirty).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">系统状态</CardTitle>
            <CardDescription>账号、适配器与仓库</CardDescription>
          </div>
          <Cpu size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users size={14} />
              平台账号
            </div>
            <div className="mt-1 text-2xl font-bold">
              {connectedAccounts}/{totalAccounts}
            </div>
            <Badge
              variant={connectedAccounts === 0 ? "secondary" : "default"}
              className="mt-2 text-[10px]"
            >
              {connectedAccounts === 0 ? "未连接" : "已连接"}
            </Badge>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive size={14} />
              适配器
            </div>
            <div className="mt-1 text-2xl font-bold">
              {connectedAdapters}/{adapters.length}
            </div>
            <Badge variant="outline" className="mt-2 text-[10px]">
              在线
            </Badge>
          </div>

          {errorJobs > 0 && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <AlertCircle size={14} />
              {errorJobs} 个任务失败
            </div>
          )}

          {dirtyRepos > 0 && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-xs text-muted-foreground">
              <AlertCircle size={14} />
              {dirtyRepos} 个仓库未同步
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
