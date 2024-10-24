import { SettingsIcon } from "lucide-react";
import { memo, useRef } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/Popover";
import { useSettingsStore } from "~/store/settings";
import { NumberInput } from "./NumberInput";
import { Button } from "./ui/Button";

export const SettingsDropdownMenu = memo(() => {
  const state = useSettingsStore();
  const slippageRef = useRef<HTMLInputElement | null>(null);
  const deadlineRef = useRef<HTMLInputElement | null>(null);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) return;
        slippageRef.current?.blur();
        deadlineRef.current?.blur();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-12 w-12">
          <SettingsIcon className="h-6 w-6 text-night-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <h4 className="font-medium leading-none">Transaction Settings</h4>
          <NumberInput
            id="settingsSlippage"
            ref={slippageRef}
            label="Slippage tolerance"
            value={state.slippage}
            onChange={(value) => state.updateSlippage(value)}
            minValue={0.001}
            maxValue={0.49}
            placeholder="0.5%"
            formatOptions={{
              style: "percent",
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            }}
            errorMessage="Slippage must be between 0.1% and 49%"
            errorCondition={(value) => value > 49}
            autoFocus
          />
          <NumberInput
            id="settingsDeadline"
            ref={deadlineRef}
            label="Transaction Deadline"
            value={state.deadline}
            onChange={(value) => state.updateDeadline(value)}
            minValue={1}
            maxValue={60}
            placeholder="20"
            errorMessage="Deadline must be between 1 and 60"
            errorCondition={(value) => value > 60}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-night-400 text-sm">Minutes</span>
            </div>
          </NumberInput>
        </div>
      </PopoverContent>
    </Popover>
  );
});

SettingsDropdownMenu.displayName = "SettingsDropdownMenu";
