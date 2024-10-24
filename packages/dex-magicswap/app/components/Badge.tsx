import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type Props = {
  children: ReactNode;
  color?: "default" | "primary" | "secondary";
  rounded?: "full" | "partially";
  size?: "xs" | "sm";
};

export const Badge = ({
  children,
  color = "default",
  rounded = "full",
  size = "sm",
}: Props) => (
  <div
    className={cn(
      "rounded-3xl bg-night-700 px-3.5 py-0.5 font-medium text-white text-xs leading-[160%]",
      color === "primary" && "bg-ruby-800/10 text-ruby-700",
      color === "secondary" && "bg-honey-500/25 text-honey-700",
      rounded === "partially" && "rounded-md",
      size === "xs" && "px-1.5 font-normal text-[0.6rem]",
    )}
  >
    {children}
  </div>
);
