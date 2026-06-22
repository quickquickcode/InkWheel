import { workflowStages } from "@/lib/constants";
import type { StageId } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";
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

  const currentIndex = workflowStages.findIndex((s) => s.id === currentStage);

  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="flex items-center justify-between gap-1">
        {workflowStages.map((stage, index) => {
          const active = stage.id === currentStage;
          const completed = index < currentIndex;
          const isLast = index === workflowStages.length - 1;

          return (
            <div key={stage.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => setCurrentView(stageToView[stage.id])}
                className={cn(
                  "group flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : completed
                        ? "bg-primary/80 text-primary-foreground"
                        : "border border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {completed ? <Check size={10} /> : stage.step}
                </span>
                <div className="min-w-0">
                  <div className={cn("text-xs font-medium", active && "text-primary")}>
                    {stage.title}
                  </div>
                  <div className="hidden text-[10px] text-muted-foreground sm:block">
                    {stage.description}
                  </div>
                </div>
              </button>
              {!isLast && (
                <ChevronRight
                  size={14}
                  className="mx-1 shrink-0 text-muted-foreground/40"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
