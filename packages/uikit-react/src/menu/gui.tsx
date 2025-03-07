import { forwardRef } from "react";
import { Menu as ArkMenu, type MenuContentProps, type MenuItemProps, type MenuTriggerProps} from '@ark-ui/react/menu'
import { recipeGuiMenu, type GuiMenuContentVariantsProps, type GuiMenuItemVariantsProps, type GuiMenuTriggerVariantsProps } from "@happy.tech/design-system";
import { cx } from "cva";

interface GuiTriggerProps extends MenuTriggerProps, GuiMenuTriggerVariantsProps {}
export const GuiTrigger = forwardRef<HTMLButtonElement, GuiTriggerProps>(
  ({ className = '', aspect, ...props }, ref) => (
    <ArkMenu.Trigger
      ref={ref}
      className={cx(recipeGuiMenu.trigger({ aspect }), className)}
      {...props}
    />
  )
)

interface GuiContentProps extends MenuContentProps, GuiMenuContentVariantsProps {}
export const GuiContent = forwardRef<HTMLDivElement, GuiContentProps>(
  ({ className = '', ...props }, ref) => (
    <ArkMenu.Content
      ref={ref}
      className={recipeGuiMenu.content({ className })}
      {...props}
    />
  )
)

interface GuiItemProps extends MenuItemProps, GuiMenuItemVariantsProps {}
export const GuiItem = forwardRef<HTMLDivElement, GuiItemProps>(
  ({ className = '', scale, intent, ...props }, ref) => (
    <ArkMenu.Item
      ref={ref}
      className={cx(recipeGuiMenu.item({ scale, intent }), className)}
      {...props}
    />
  )
)
