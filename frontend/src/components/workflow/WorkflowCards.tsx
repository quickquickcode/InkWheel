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
    <Card className="col-span-8">
      <CardHeader>
        <CardTitle>工作流</CardTitle>
        <CardDescription>当前所处阶段与下一步目标</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workflowStages.map((stage) => {
            const active = stage.id === currentStage;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setCurrentView(stageToView[stage.id])}
                className={cn(
                  "relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {stage.step}
                </span>
                <div>
                  <div className="text-sm font-semibold">{stage.title}</div>
                  <div
                    className={cn(
                      "mt-1 text-xs",
                      active ? "text-primary/80" : "text-muted-foreground"
                    )}
                  >
                    {stage.description}
                  </div>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
