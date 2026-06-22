import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, HardDrive, Users, AlertCircle, Bot } from "lucide-react";

export function SystemStatus() {
  const { accounts, adapters, repos, jobs, llmAvailable } = useAppStore();

  const connectedAdapters = adapters.filter((a) => a.connected).length;
  const connectedAccounts = accounts.filter((a) => a.status === "connected").length;
  const totalAccounts = accounts.length || adapters.length || 0;
  const errorJobs = jobs.filter((j) => j.status === "error").length;
  const dirtyRepos = repos.filter((r) => r.dirty).length;

  const items: {
    icon: typeof Users;
    label: string;
    value: string;
    badge: string;
    variant: "default" | "secondary" | "outline";
  }[] = [
    {
      icon: Users,
      label: "平台账号",
      value: `${connectedAccounts}/${totalAccounts}`,
      badge: connectedAccounts === 0 ? "未连接" : "已连接",
      variant: connectedAccounts === 0 ? "secondary" : "default",
    },
    {
      icon: HardDrive,
      label: "适配器",
      value: `${connectedAdapters}/${adapters.length}`,
      badge: "在线",
      variant: "outline",
    },
    {
      icon: Bot,
      label: "AI 模型",
      value: llmAvailable ? "可用" : "未配置",
      badge: llmAvailable ? "LLM" : "模板兜底",
      variant: llmAvailable ? "default" : "secondary",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">系统状态</CardTitle>
          <Cpu size={14} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center rounded-md border p-2 text-center"
            >
              <item.icon size={14} className="text-muted-foreground" />
              <div className="mt-1 text-[10px] text-muted-foreground">{item.label}</div>
              <div className="text-sm font-bold">{item.value}</div>
              <Badge variant={item.variant} className="mt-1 text-[9px]">
                {item.badge}
              </Badge>
            </div>
          ))}
        </div>

        {errorJobs > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <AlertCircle size={14} />
            {errorJobs} 个任务失败
          </div>
        )}

        {dirtyRepos > 0 && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
            <AlertCircle size={14} />
            {dirtyRepos} 个仓库未同步
          </div>
        )}
      </CardContent>
    </Card>
  );
}
