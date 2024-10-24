import type React from "react";

import { cn } from "~/lib/utils";

interface Props {
  Icon?: React.ElementType;
  iconClass?: string;
  value: string | number;
  title: string;
}

export const StatisticCard = ({ Icon, iconClass, value, title }: Props) => {
  return (
    <div className="relative flex h-[88px] w-full flex-col justify-center overflow-hidden rounded-lg border-t border-t-night-800 bg-night-1000 px-6 shadow-xl lg:h-[110px] lg:px-8">
      <div className="relative z-10 flex items-center gap-2 lg:gap-3">
        {!!Icon && <Icon className={cn("w-5 lg:w-6", iconClass)} />}
        <p className="font-bold text-night-100 text-xl leading-[160%] lg:text-2xl">
          {value}
        </p>
      </div>
      <p className="relative z-10 text-night-400 text-sm uppercase leading-[130%]">
        {title}
      </p>
    </div>
  );
};
