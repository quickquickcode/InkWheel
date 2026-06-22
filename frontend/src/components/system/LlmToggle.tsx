import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { Bot, FileText } from "lucide-react";

interface LlmToggleProps {
  showBadge?: boolean;
}

export function LlmToggle({ showBadge = true }: LlmToggleProps) {
  const { useLlm, llmAvailable, toggleUseLlm } = useAppStore();
  const active = useLlm && llmAvailable;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
      {showBadge && (
        <Badge
          variant={active ? "default" : "secondary"}
          className="gap-1 text-[10px]"
          title={
            llmAvailable
              ? active
                ? "生成时将调用 LLM（可能较慢）"
                : "生成时使用模板快速产出"
              : "当前 LLM 不可用，将使用模板生成"
          }
        >
          {active ? (
            <>
              <Bot size={10} />
              LLM
            </>
          ) : (
            <>
              <FileText size={10} />
              模板
            </>
          )}
        </Badge>
      )}
      <Switch
        id="use-llm"
        checked={active}
        onCheckedChange={toggleUseLlm}
        disabled={!llmAvailable}
        className="scale-90"
      />
      <label
        htmlFor="use-llm"
        className={`text-xs ${!llmAvailable ? "text-muted-foreground" : "cursor-pointer"}`}
      >
        使用 LLM
      </label>
    </div>
  );
}
