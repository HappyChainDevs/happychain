import {
    Collapsible as ArkCollapsible,
    type CollapsibleContentProps,
    type CollapsibleRootProps,
    type CollapsibleTriggerProps,
} from "@ark-ui/react/collapsible"
import {
    type GuiCollapsibleContainerVariantsProps,
    type GuiCollapsibleContentVariantsProps,
    type GuiCollapsibleTriggerVariantsProps,
    recipeGuiCollapsible,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"

interface GuiContainerProps extends CollapsibleRootProps, GuiCollapsibleContainerVariantsProps {}
export const GuiContainer = forwardRef<HTMLDivElement, GuiContainerProps>(
    ({ className = "", scale, intent, ...props }, ref) => (
        <ArkCollapsible.Root
            ref={ref}
            className={cx(recipeGuiCollapsible.container({ scale, intent }), className)}
            {...props}
        />
    ),
)

interface GuiTriggerProps extends CollapsibleTriggerProps, GuiCollapsibleTriggerVariantsProps {}
export const GuiTrigger = forwardRef<HTMLButtonElement, GuiTriggerProps>(
    ({ className = "", scale, children, ...props }, ref) => (
        <ArkCollapsible.Trigger ref={ref} className={cx(recipeGuiCollapsible.trigger({ scale }), className)} {...props}>
            {children}
            <span data-expandable-indicator="" />
        </ArkCollapsible.Trigger>
    ),
)

interface GuiContentProps extends CollapsibleContentProps, GuiCollapsibleContentVariantsProps {}
export const GuiContent = forwardRef<HTMLDivElement, GuiContentProps>(({ className = "", scale, ...props }, ref) => (
    <ArkCollapsible.Content ref={ref} className={cx(recipeGuiCollapsible.content({ scale }), className)} {...props} />
))
