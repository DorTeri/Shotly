"use client";

import { Camera, Images, ListChecks, Film } from "lucide-react";

export type View = "camera" | "darkroom" | "quests" | "roll";

const TABS: { id: View; label: string; Icon: typeof Camera }[] = [
  { id: "camera", label: "מצלמה", Icon: Camera },
  { id: "darkroom", label: "חדר חושך", Icon: Images },
  { id: "quests", label: "משימות", Icon: ListChecks },
  { id: "roll", label: "הרול שלי", Icon: Film },
];

export function TabBar({
  view,
  onChange,
  developing,
}: {
  view: View;
  onChange: (v: View) => void;
  developing: number;
}) {
  return (
    <nav className="no-touch-callout grid flex-none grid-cols-4 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      {TABS.map(({ id, label, Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active}
            className={`relative flex min-h-[62px] flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${
              active ? "text-safelight" : "text-paper-3"
            }`}
          >
            <Icon size={21} strokeWidth={1.7} aria-hidden />
            <span>{label}</span>
            {id === "darkroom" && developing > 0 && (
              <span className="tabular absolute top-2 right-[calc(50%-22px)] rounded-full bg-film px-1.5 text-[10px] font-semibold text-ink">
                {developing}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
