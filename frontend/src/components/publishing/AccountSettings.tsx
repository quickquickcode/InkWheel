import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Save, RefreshCw, Chrome, Loader2, CheckCircle, XCircle, HelpCircle } from "lucide-react";

export function AccountSettings() {
  const store = useAppStore();
  const account = store.getToutiaoAccount();
  const { saveToutiaoAccount, checkToutiao, loginToutiao, accountLoading, toutiaoProgress } =
    usePublish();

  const [label, setLabel] = useState(account?.label || "");
  const [cookiePath, setCookiePath] = useState(account?.cookie_path || "");
  const [notes, setNotes] = useState(account?.notes || "");

  useEffect(() => {
    setLabel(account?.label || "");
    setCookiePath(account?.cookie_path || "");
    setNotes(account?.notes || "");
  }, [account]);

  const handleSave = () => {
    void saveToutiaoAccount(label, cookiePath, notes);
  };

  const statusIcon = account?.status === "connected" ? (
    <CheckCircle size={14} className="text-green-500" />
  ) : account?.status === "not_connected" ? (
    <XCircle size={14} className="text-destructive" />
  ) : (
    <HelpCircle size={14} className="text-muted-foreground" />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">账号配置</CardTitle>
            <CardDescription>管理今日头条等平台的登录凭据</CardDescription>
          </div>
          <User size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔵</span>
            <div>
              <p className="text-sm font-medium">今日头条</p>
              <p className="text-xs text-muted-foreground">
                {account?.label || "未配置账号"}
              </p>
            </div>
          </div>
          <Badge variant={account?.status === "connected" ? "default" : "secondary"}>
            <span className="mr-1">{statusIcon}</span>
            {account?.status === "connected" ? "已连接" : account?.status === "not_connected" ? "未连接" : "未知"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="account-label" className="text-xs font-medium">
              账号标签
            </label>
            <Input
              id="account-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="例如：主账号 / 测试号"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cookie-path" className="text-xs font-medium">
              Cookie 路径
            </label>
            <Input
              id="cookie-path"
              value={cookiePath}
              onChange={(event) => setCookiePath(event.target.value)}
              placeholder="/path/to/cookies.json"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="account-notes" className="text-xs font-medium">
            备注
          </label>
          <Textarea
            id="account-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="记录账号用途、有效期等信息"
            rows={2}
          />
        </div>

        {toutiaoProgress && (
          <div className="space-y-1 rounded-lg border bg-muted/50 p-3">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{toutiaoProgress.title}</span>
              <span className="text-muted-foreground">{toutiaoProgress.percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${toutiaoProgress.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{toutiaoProgress.message}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSave} disabled={accountLoading}>
            {accountLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存配置
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void checkToutiao()}
            disabled={accountLoading}
          >
            {accountLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            检查登录状态
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loginToutiao()}
            disabled={accountLoading}
          >
            {accountLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Chrome size={14} />
            )}
            打开浏览器登录
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
