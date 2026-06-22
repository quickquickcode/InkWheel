import { useState } from "react";
import type { AdapterPreview, AdapterResult, PlatformId } from "@/types";
import { useAppStore } from "@/store/app-store";
import { usePublish } from "@/hooks/use-publish";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { platformLabels, platformIcons } from "@/lib/utils";
import { platforms } from "@/lib/constants";
import { Eye, Play, FileText, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export function PublishForm() {
  const store = useAppStore();
  const { posts, publishPostId, activePlatform } = store;
  const publishPost = store.getPublishPost();

  const { preview, previewing, execute, executing } = usePublish();
  const [lastPreview, setLastPreview] = useState<AdapterPreview | undefined>();
  const [lastResult, setLastResult] = useState<AdapterResult | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePreview = async () => {
    if (!publishPostId) return;
    setLastResult(undefined);
    const result = await preview(publishPostId, activePlatform);
    setLastPreview(result);
  };

  const handleExecute = async () => {
    if (!publishPostId) return;
    setConfirmOpen(false);
    setLastPreview(undefined);
    const result = await execute(publishPostId, activePlatform, false);
    setLastResult(result);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">发布预览与执行</CardTitle>
            <CardDescription>生成适配器预览载荷并执行外部工具</CardDescription>
          </div>
          <FileText size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">待发布文案</label>
            <Select
              value={publishPostId}
              onValueChange={(value) => store.setPublishPostId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择文案" />
              </SelectTrigger>
              <SelectContent>
                {posts.length === 0 && (
                  <SelectItem value="__empty__" disabled>
                    暂无可用文案
                  </SelectItem>
                )}
                {posts.map((post) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.source_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">目标平台</label>
            <Select
              value={activePlatform}
              onValueChange={(value) => store.setActivePlatform(value as PlatformId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    <span className="mr-1">{platform.icon}</span>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handlePreview}
            disabled={previewing === activePlatform || !publishPostId}
          >
            {previewing === activePlatform ? (
              <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Eye size={14} />
            )}
            生成预览
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                disabled={executing === activePlatform || !publishPostId}
              >
                {executing === activePlatform ? (
                  <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play size={14} />
                )}
                执行外部工具预览
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500" />
                  确认执行外部工具预览？
                </DialogTitle>
                <DialogDescription>
                  这将调用 {platformLabels[activePlatform]} 的真实外部工具，可能会打开浏览器或创建草稿，但不会自动点击发布。
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                文案：{publishPost?.source_title || "未选择"}
                <br />
                平台：{platformLabels[activePlatform]}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                  取消
                </Button>
                <Button size="sm" onClick={handleExecute}>
                  确认执行
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {lastPreview && (
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Eye size={14} className="text-slate-500" />
              <span className="text-sm font-medium">最近预览结果</span>
              <Badge variant={lastPreview.ok ? "default" : "destructive"} className="text-[10px]">
                {lastPreview.ok ? "成功" : "失败"}
              </Badge>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{lastPreview.message}</p>
            <div className="rounded-md bg-muted p-2">
              <p className="text-[10px] font-medium text-muted-foreground">载荷预览</p>
              <pre className="mt-1 max-h-32 overflow-auto text-[10px] text-foreground/80">
                {JSON.stringify(lastPreview.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {lastResult && (
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Play size={14} className="text-slate-500" />
              <span className="text-sm font-medium">最近执行结果</span>
              <Badge variant={lastResult.ok ? "default" : "destructive"} className="text-[10px]">
                {lastResult.ok ? "成功" : "失败"}
              </Badge>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{lastResult.message}</p>
            <div className="space-y-1 rounded-md bg-muted p-2 text-[10px] text-muted-foreground">
              <p>
                <span className="font-medium">命令：</span>
                <code className="ml-1 text-foreground/80">{lastResult.command}</code>
              </p>
              {lastResult.stdout && (
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-foreground/80">
                  {lastResult.stdout}
                </pre>
              )}
              {lastResult.stderr && (
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-destructive">
                  {lastResult.stderr}
                </pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
