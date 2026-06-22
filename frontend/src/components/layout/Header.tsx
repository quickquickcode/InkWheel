import { navItems } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, BookOpen, ChevronDown, HelpCircle, Menu, User } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentView, accounts, jobs } = useAppStore();
  const currentNav = navItems.find((item) => item.id === currentView);
  const connectedAccounts = accounts.filter((a) => a.status === "connected").length;
  const errorJobs = jobs.filter((j) => j.status === "error").length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu size={18} />
        </Button>
        <div>
          <h1 className="text-base font-semibold">{currentNav?.label ?? "仪表盘"}</h1>
          <p className="text-[10px] text-muted-foreground">{currentNav?.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={18} />
                {errorJobs > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>通知</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <BookOpen size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>指南</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>帮助</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Badge variant="outline" className="hidden text-xs font-normal sm:inline-flex">
          账号已连接 {connectedAccounts}/{accounts.length || 3}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <User size={14} />
              </div>
              <span className="hidden text-xs sm:inline">张同学</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>个人设置</DropdownMenuItem>
            <DropdownMenuItem>账号管理</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
