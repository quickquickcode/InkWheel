import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { usePublish } from "@/hooks/use-publish";
import { AdapterCards } from "@/components/publishing/AdapterCards";
import { PublishForm } from "@/components/publishing/PublishForm";
import { AccountSettings } from "@/components/publishing/AccountSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listExternalRepos, syncExternalRepo } from "@/lib/api";
import type { RepoStatus } from "@/types";
import { GitBranch, RefreshCw, CheckCircle2, AlertCircle, GitCommitHorizontal } from "lucide-react";
import { relativeTime } from "@/lib/utils";

export function PublishingView() {
  const store = useAppStore();
  const { adapters } = store;
  const { accountLoading } = usePublish();

  const [repos, setRepos] = useState<RepoStatus[]>(store.repos);
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);

  useEffect(() => {
    void refreshRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRepos = async () => {
    try {
      const result = await listExternalRepos();
      setRepos(result.items);
      store.setRepos(result.items);
    } catch {
      setRepos(store.repos);
    }
  };

  const handleSync = async (name: string) => {
    if (syncingRepo) return;
    setSyncingRepo(name);
    try {
      const result = await syncExternalRepo(name);
      setRepos((current) =>
        current.map((repo) => (repo.name === name ? result.repo : repo))
      );
      store.setRepos(
        store.repos.map((repo) => (repo.name === name ? result.repo : repo))
      );
    } finally {
      setSyncingRepo(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">发布管理</h2>
        <p className="text-xs text-muted-foreground">平台适配器状态、预览执行与账号配置</p>
      </div>

      <AdapterCards adapters={adapters} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">外部仓库同步</CardTitle>
              <CardDescription>运营商与内容模板等外部资源</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => void refreshRepos()}>
                <RefreshCw size={14} />
              </Button>
              <GitBranch size={16} className="text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {repos.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无外部仓库数据</p>
          ) : (
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between rounded-lg border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GitCommitHorizontal size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{repo.name}</span>
                      {repo.dirty ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">
                          有变更
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          干净
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>当前：{repo.current_commit?.slice(0, 7) || "—"}</span>
                      {repo.commits_behind > 0 && (
                        <span className="text-amber-600">落后 {repo.commits_behind} 提交</span>
                      )}
                      <span>同步于 {repo.last_sync ? relativeTime(repo.last_sync) : "从未"}</span>
                      {repo.error && (
                        <span className="text-destructive">错误：{repo.error}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSync(repo.name)}
                    disabled={syncingRepo === repo.name}
                  >
                    {syncingRepo === repo.name ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    同步
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PublishForm />

      <AccountSettings />
    </div>
  );
}
