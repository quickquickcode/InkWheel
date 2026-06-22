import { useCallback, useState } from "react";
import {
  checkToutiaoAccount,
  executePreview,
  getDashboard,
  loginToutiaoAccount,
  previewPublish,
  publishToutiaoMicro as publishToutiaoMicroApi,
  updateToutiaoAccount,
} from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import type { JobProgressData, PlatformId } from "@/types";
import { messageOf, platformLabels } from "@/lib/utils";

export function usePublish() {
  const store = useAppStore();
  const [previewing, setPreviewing] = useState<PlatformId | undefined>();
  const [executing, setExecuting] = useState<PlatformId | undefined>();
  const [publishingToutiao, setPublishingToutiao] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [toutiaoProgress, setToutiaoProgress] = useState<JobProgressData | undefined>();

  const refreshDashboard = async (nextPostId?: string) => {
    const dashboard = await getDashboard();
    store.setDashboard(dashboard);
    if (nextPostId) store.setPublishPostId(nextPostId);
  };

  const preview = useCallback(
    async (postId: string, platform: PlatformId) => {
      if (previewing) return;
      setPreviewing(platform);
      try {
        const result = await previewPublish(postId, platform);
        store.setAdapters(result.adapters);
        store.prependJob(result.job);
        store.addToast({
          title: "预览已生成",
          message: `${platformLabels[platform]} 预览载荷已生成`,
          status: "success",
        });
        return result.preview;
      } catch (error) {
        store.addToast({
          title: "预览失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setPreviewing(undefined);
      }
    },
    [previewing, store],
  );

  const execute = useCallback(
    async (postId: string, platform: PlatformId, dryRun = false) => {
      if (executing) return;
      setExecuting(platform);
      try {
        const result = await executePreview(postId, platform, dryRun);
        store.setAdapters(result.adapters);
        store.prependJob(result.job);
        store.addToast({
          title: "执行完成",
          message: `${platformLabels[platform]} 外部工具执行完成`,
          status: result.result.ok ? "success" : "error",
        });
        return result.result;
      } catch (error) {
        store.addToast({
          title: "执行失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setExecuting(undefined);
      }
    },
    [executing, store],
  );

  const saveToutiaoAccount = useCallback(
    async (label: string, cookiePath: string, notes?: string) => {
      setAccountLoading(true);
      try {
        const result = await updateToutiaoAccount({ label, cookiePath, notes });
        store.setAccounts(
          store.accounts.map((account) => (account.platform === "toutiao" ? result.account : account)),
        );
        store.setAdapters(
          store.adapters.map((adapter) => (adapter.platform === "toutiao" ? result.adapter : adapter)),
        );
        store.addToast({
          title: "账号已保存",
          message: "今日头条账号配置已保存",
          status: "success",
        });
      } catch (error) {
        store.addToast({
          title: "保存失败",
          message: messageOf(error),
          status: "error",
        });
      } finally {
        setAccountLoading(false);
      }
    },
    [store],
  );

  const checkToutiao = useCallback(async () => {
    setAccountLoading(true);
    try {
      const result = await checkToutiaoAccount();
      store.setAccounts(
        store.accounts.map((account) => (account.platform === "toutiao" ? result.account : account)),
      );
      store.setAdapters(
        store.adapters.map((adapter) => (adapter.platform === "toutiao" ? result.adapter : adapter)),
      );
      store.addToast({
        title: "账号状态",
        message: `今日头条账号状态：${result.account.status === "connected" ? "已连接" : "未连接"}`,
        status: result.account.status === "connected" ? "success" : "warning",
      });
    } catch (error) {
      store.addToast({
        title: "检查失败",
        message: messageOf(error),
        status: "error",
      });
    } finally {
      setAccountLoading(false);
    }
  }, [store]);

  const loginToutiao = useCallback(async () => {
    setAccountLoading(true);
    try {
      const result = await loginToutiaoAccount();
      setToutiaoProgress(undefined);
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/jobs/${result.job_id}`,
          );
          if (!response.ok) return;
          const data: JobProgressData = await response.json();
          setToutiaoProgress(data);
          if (["completed", "failed", "cancelled"].includes(data.status)) {
            clearInterval(interval);
            setAccountLoading(false);
            await checkToutiao();
          }
        } catch {
          // ignore
        }
      }, 800);
      store.addToast({
        title: "登录流程启动",
        message: "已打开今日头条登录浏览器，请在浏览器里完成登录",
        status: "info",
      });
    } catch (error) {
      setAccountLoading(false);
      store.addToast({
        title: "登录失败",
        message: messageOf(error),
        status: "error",
      });
    }
  }, [checkToutiao, store]);

  const publishToutiaoMicro = useCallback(
    async (postId: string, topic?: string) => {
      if (publishingToutiao) return;
      setPublishingToutiao(true);
      setToutiaoProgress(undefined);
      try {
        const result = await publishToutiaoMicroApi(postId, topic);
        const interval = setInterval(async () => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/jobs/${result.job_id}`,
            );
            if (!response.ok) return;
            const data: JobProgressData = await response.json();
            setToutiaoProgress(data);
            if (["completed", "failed", "cancelled"].includes(data.status)) {
              clearInterval(interval);
              setPublishingToutiao(false);
              await refreshDashboard(postId);
              store.addToast({
                title: data.status === "completed" ? "发布准备完成" : "发布准备失败",
                message:
                  data.status === "completed"
                    ? "浏览器已打开并填入微头条内容，请在页面内检查并发布"
                    : data.error || "准备失败",
                status: data.status === "completed" ? "success" : "error",
              });
            }
          } catch {
            // ignore
          }
        }, 800);
      } catch (error) {
        setPublishingToutiao(false);
        store.addToast({
          title: "发布准备失败",
          message: messageOf(error),
          status: "error",
        });
      }
    },
    [publishingToutiao, store],
  );

  return {
    preview,
    previewing,
    execute,
    executing,
    saveToutiaoAccount,
    checkToutiao,
    loginToutiao,
    publishToutiaoMicro,
    publishingToutiao,
    accountLoading,
    toutiaoProgress,
  };
}
