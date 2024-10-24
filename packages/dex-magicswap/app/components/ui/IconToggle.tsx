import type React from "react";
import { useState } from "react";

import { cn } from "~/lib/utils";

interface IconToggleProps {
  icons: {
    id: string;
    icon: React.ElementType;
  }[];
  onChange: (id: string) => void;
}

const IconToggle = ({ icons, onChange }: IconToggleProps) => {
  const [selected, setSelected] = useState(0);

  const handleSelect = (id: string, index: number) => {
    setSelected(index);
    onChange(id);
  };

  return (
    <div className="relative flex h-9 items-center rounded-md bg-night-1000 p-1">
      <div
        className="-translate-y-1/2 absolute top-1/2 z-5 h-7 w-7 rounded bg-night-700 transition-all"
        style={{ left: selected * 28 + 4 }}
      />
      {icons.map(({ id, icon: Icon }, index) => (
        <button
          key={id}
          type="button"
          className={cn(
            "relative z-10 flex h-7 w-7 items-center justify-center text-night-600 hover:text-night-100",
            index === selected && "text-night-100",
          )}
          onClick={() => handleSelect(id, index)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};

export default IconToggle;
