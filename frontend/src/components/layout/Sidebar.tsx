import { navItems } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Cpu, Sparkles } from "lucide-react";

export function Sidebar() {
  const { currentView, setCurrentView, jobs } = useAppStore();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-primary-foreground">
          <Sparkles size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight">InkWheel</span>
          <span className="text-[10px] text-muted-foreground">墨轮 AI 运营控制台</span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "logs" && jobs.length > 0 && (
                  <Badge variant={active ? "secondary" : "default"} className="h-5 min-w-5 px-1 text-[10px]">
                    {jobs.length}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <div className="space-y-3 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">资源使用</p>
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">今日调用</span>
                <span>38 / 200</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[19%] rounded-full bg-teal" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">内容生成</span>
                <span>42 / 100</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[42%] rounded-full bg-indigo" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">发布配额</span>
                <span>5 / 50</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[10%] rounded-full bg-amber" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Cpu size={14} />
          <span>实验环境 (dev)</span>
        </div>
      </div>
    </aside>
  );
}
