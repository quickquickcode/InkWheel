import { Loader2, RefreshCw, X } from "lucide-react";
import type { TopicConfig } from "../types";

interface HeroSectionProps {
  activeTopic: TopicConfig | undefined;
  collecting: boolean;
  clearingContent: boolean;
  useLlm: boolean;
  onCollect: () => void;
  onClear: () => void;
  onLlmToggle: () => void;
}

export function HeroSection({ activeTopic, collecting, clearingContent, useLlm, onCollect, onClear, onLlmToggle }: HeroSectionProps) {
  return (
    <header className="heroScroll">
      <div>
        <span className="overline">CONTENT STUDIO</span>
        <h1 className="font-comic">POP CONTENT LAB</h1>
        <p>
          选题、分析、生成三平台内容的一站式工作台。
        </p>
      </div>
      <div className="heroActions">
        <button className="inkButton primary" onClick={onCollect} disabled={!activeTopic || collecting}>
          {collecting ? <Loader2 size={17} className="spin" /> : <RefreshCw size={17} />}
          {collecting ? "采集中" : "刷新"}
        </button>
        <button className="inkButton ghost" onClick={onClear} disabled={clearingContent}>
          {clearingContent ? <Loader2 size={17} className="spin" /> : <X size={17} />}
          {clearingContent ? "清理中" : "清空"}
        </button>
        <label className="switchLine">
          <input type="checkbox" checked={useLlm} onChange={onLlmToggle} />
          <span>AI 生成</span>
        </label>
      </div>
    </header>
  );
}
