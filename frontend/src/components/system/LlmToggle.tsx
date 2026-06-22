import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/app-store";
import { Bot, FileText } from "lucide-react";

interface LlmToggleProps {
  showBadge?: boolean;
}

export function LlmToggle({ showBadge = true }: LlmToggleProps) {
  const { useLlm, llmAvailable, toggleUseLlm } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      {showBadge && (
        <Badge variant={useLlm && llmAvailable ? "default" : "secondary"} className="gap-1 text-xs">
          {useLlm && llmAvailable ? (
            <>
              <Bot size={12} />
              LLM
            </>
          ) : (
            <>
              <FileText size={12} />
              模板
            </>
          )}
        </Badge>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Switch
                id="use-llm"
                checked={useLlm && llmAvailable}
                onCheckedChange={toggleUseLlm}
                disabled={!llmAvailable}
              />
              <label
                htmlFor="use-llm"
                className={`text-xs ${!llmAvailable ? "text-muted-foreground" : "cursor-pointer"}`}
              >
                使用 LLM
              </label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {llmAvailable
              ? useLlm
                ? "生成时将调用 LLM（可能较慢）"
                : "生成时使用模板快速产出"
              : "当前 LLM 不可用，将使用模板生成"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
