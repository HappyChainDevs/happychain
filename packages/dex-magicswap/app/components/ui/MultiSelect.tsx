import type React from "react";

import { cn } from "~/lib/utils";

interface Tab {
  id: string;
  name: string;
  amount?: number;
  icon?: React.ElementType;
}

export const MultiSelect = ({
  activeTab,
  setActiveTab,
  tabs,
  className,
}: {
  activeTab: string;
  setActiveTab: (arg0: string) => void;
  className?: string;
  tabs: Tab[];
}) => {
  return (
    <div
      className={cn(
        "flex h-max w-full items-center justify-between rounded-full bg-night-1100 p-1",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-full py-2 font-medium text-night-400 text-sm leading-[160%] transition-colors sm:text-base",
            activeTab === tab.id && "bg-night-800 text-night-100",
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon && <tab.icon className="w-5" />}
          {tab.name}
          {!!tab.amount && tab.amount > 0 && (
            <p className="rounded-full bg-night-700 px-3 py-1 font-medium text-xs">
              {tab.amount}
            </p>
          )}
        </button>
      ))}
    </div>
  );
};
