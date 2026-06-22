import { workflowStages } from "@/lib/constants";
import type { StageId } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/types";

const stageToView: Record<StageId, ViewId> = {
  gather: "dashboard",
  read: "trends",
  compose: "studio",
  publish: "publishing",
};

export function WorkflowCards() {
  const { currentView, articles, posts, setCurrentView } = useAppStore();

  const currentStage: StageId = (() => {
    if (currentView === "publishing") return "publish";
    if (posts.length > 0) return "compose";
    if (articles.length === 0) return "gather";
    return "read";
  })();

  return (
    <div className="grid grid-cols-4 gap-2">
      {workflowStages.map((stage) => {
        const active = stage.id === currentStage;
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => setCurrentView(stageToView[stage.id])}
            className={cn(
              "relative flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:bg-accent/50"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                active
                  ? "bg-primary-foreground text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {stage.step}
            </span>
            <span className="text-xs font-medium">{stage.title}</span>
            {active && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
