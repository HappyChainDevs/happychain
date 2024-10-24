import { useLocale } from "@react-aria/i18n";
import { useNumberField } from "@react-aria/numberfield";
import { useNumberFieldState } from "@react-stately/numberfield";
import type { MutableRefObject } from "react";
import type React from "react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";

export const NumberInput = forwardRef<
  HTMLInputElement,
  Parameters<typeof useNumberField>[0] & {
    errorCondition: (value: number) => boolean;
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children, errorCondition, ...props }, ref) => {
  const { locale } = useLocale();
  const state = useNumberFieldState({ ...props, locale });
  const { labelProps, inputProps } = useNumberField(
    props,
    state,
    ref as MutableRefObject<HTMLInputElement>,
  );

  const sanitizedValue = Number.parseFloat(
    state.inputValue.replace(/[^0-9.]/g, ""),
  );

  return (
    <div className="flex-1">
      <Label htmlFor={props.id} {...labelProps}>
        {props.label}
      </Label>
      <div className="relative mt-1 rounded-md shadow-sm">
        <Input
          {...inputProps}
          ref={ref}
          className={cn(
            sanitizedValue > 49
              ? "focus:border-ruby-500 focus:ring-ruby-500"
              : "focus:border-night-500 focus:ring-night-500",
            "block w-full rounded-md bg-night-800/60 text-sm focus:border-night-500",
            className,
          )}
          placeholder={props.placeholder}
        />
        {children}
      </div>
      {props.errorMessage && errorCondition(sanitizedValue) ? (
        <p className="mt-2 text-ruby-600 text-sm">
          {props.errorMessage.toString()}
        </p>
      ) : null}
    </div>
  );
});

NumberInput.displayName = "NumberInput";
