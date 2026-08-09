"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-2 rounded-full border border-mauve/40 bg-blush/80 p-1.5 shadow-soft backdrop-blur-sm",
        className,
      )}
      role="tablist"
      aria-label="Tabs"
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`tab-${tab.id}`}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition-all duration-200",
              selected
                ? "bg-plum text-canvas shadow-plum"
                : "text-plum hover:bg-canvas/90",
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
