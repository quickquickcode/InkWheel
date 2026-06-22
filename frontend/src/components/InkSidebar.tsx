import { Menu, X } from "lucide-react";

type StageId = "gather" | "read" | "compose" | "publish";

const stages: Array<{ id: StageId; label: string; seal: string }> = [
  { id: "gather", label: "选题", seal: "1" },
  { id: "read", label: "读文", seal: "2" },
  { id: "compose", label: "生成", seal: "3" },
  { id: "publish", label: "发布", seal: "4" },
];

function scrollToInkSection(id: string) {
  const target = document.getElementById(id);
  if (typeof target?.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

interface InkSidebarProps {
  activeStage: StageId;
  onStageClick: (stageId: StageId) => void;
  mobileRailOpen: boolean;
  onMobileRailOpen: () => void;
  onMobileRailClose: () => void;
}

export function InkSidebar({ activeStage, onStageClick, mobileRailOpen, onMobileRailOpen, onMobileRailClose }: InkSidebarProps) {
  return (
    <>
      <button className="mobileMenu" aria-label="打开导航" onClick={() => onMobileRailOpen()}>
        <Menu size={20} />
      </button>

      <aside className={mobileRailOpen ? "inkRail open" : "inkRail"}>
        <button className="railClose" aria-label="关闭导航" onClick={() => onMobileRailClose()}>
          <X size={18} />
        </button>
        <div className="brandSeal">C</div>
        <div className="brandCopy">
          <span>CyberLab</span>
          <strong className="font-bungee">内容工坊</strong>
        </div>
        <nav className="stageNav" aria-label="工作流">
          {stages.map((stage) => (
            <button
              key={stage.id}
              className={stage.id === activeStage ? "stageButton active" : "stageButton"}
              onClick={() => {
                if (stage.id === "gather") scrollToInkSection("topics");
                if (stage.id === "read") scrollToInkSection("article-preview");
                if (stage.id === "compose") scrollToInkSection("composition-preview");
                if (stage.id === "publish") scrollToInkSection("publish-dock");
                onStageClick(stage.id);
              }}
            >
              <span className="stageSeal">{stage.seal}</span>
              <span>{stage.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebarMotto">CREATE · PUBLISH</div>
      </aside>

      {mobileRailOpen ? <button className="railScrim" aria-label="关闭导航" onClick={() => onMobileRailClose()} /> : null}
    </>
  );
}
