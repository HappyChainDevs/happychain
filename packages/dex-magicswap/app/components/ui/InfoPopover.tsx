import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Balancer } from "react-wrap-balancer";

import { cn } from "~/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

type Props = {
  buttonClassName?: string;
  children: ReactNode;
};

export const InfoPopover = ({ buttonClassName, children }: Props) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="group">
        <HelpCircle
          className={cn(
            "h-4 w-4 text-night-200 transition-colors group-hover:text-night-500",
            buttonClassName,
          )}
        />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72">
      <p className="text-night-300 text-xs">
        <Balancer>{children}</Balancer>
      </p>
    </PopoverContent>
  </Popover>
);
