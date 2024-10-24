import { Minus as MinusIcon, Plus as PlusIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export const NumberSelect = ({
  max = 99,
  onChange,
  value,
}: {
  max?: number;
  onChange: (num: number) => void;
  value: number;
}) => {
  const updateNumber = (direction: "add" | "sub" | "replace") => {
    if (direction === "add" && value < max) {
      onChange(value + 1);
    }
    if (direction === "sub" && value > 0) {
      onChange(value - 1);
    }
  };

  const overrideNumber = (stringValue: string) => {
    const newValue = Number(stringValue);
    if (Number.isNaN(newValue)) return;
    onChange(Math.min(newValue, max));
  };

  return (
    <div className="flex items-center gap-2 rounded-md bg-night-1100 p-2">
      <button
        type="button"
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-night-400 opacity-50 transition-colors",
          value > 1 && "opacity-100 hover:bg-night-1000 hover:text-night-200",
        )}
        disabled={value <= 1}
        onClick={() => updateNumber("sub")}
      >
        <MinusIcon className="w-4" />
      </button>
      <input
        value={value}
        min={0}
        max={max}
        onChange={(e) => {
          overrideNumber(e.target.value);
        }}
        className="center w-10 bg-transparent text-center font-medium text-night-100 text-sm"
      />
      <button
        type="button"
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-night-400 opacity-50 transition-colors",
          value < max && "opacity-100 hover:bg-night-1000 hover:text-night-200",
        )}
        disabled={value >= max}
        onClick={() => updateNumber("add")}
      >
        <PlusIcon className="w-4" />
      </button>
    </div>
  );
};
