import { ReactNode } from "react";

export function PanelHead({ title, note, icon }: { title: string; note?: string; icon?: ReactNode }) {
  return (
    <div className="panelHead">
      <div>
        {icon}
        <h2 className="font-bungee">{title}</h2>
      </div>
      {note ? <span>{note}</span> : null}
    </div>
  );
}
