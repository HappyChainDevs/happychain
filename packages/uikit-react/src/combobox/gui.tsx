import { ark } from "@ark-ui/react"
import {
    Combobox as ArkCombobox,
    type CollectionItem,
    type ComboboxClearTriggerProps,
    type ComboboxContentProps,
    type ComboboxControlProps,
    type ComboboxInputProps,
    type ComboboxItemGroupLabelProps,
    type ComboboxItemGroupProps,
    type ComboboxItemIndicatorProps,
    type ComboboxItemProps,
    type ComboboxItemTextProps,
    type ComboboxLabelProps,
    type ComboboxPositionerProps,
    type ComboboxRootProps,
    type ComboboxTriggerProps,
} from "@ark-ui/react/combobox"
import {
    type GuiComboboxClearTriggerVariantsProps,
    type GuiComboboxControlVariantsProps,
    type GuiComboboxPositionerVariantsProps,
    type GuiFormFieldContainerVariantsProps,
    type GuiFormFieldLabelVariantsProps,
    type GuiPanelVariantsProps,
    type GuiUserInputVariantsProps,
    recipeGuiCombobox,
    recipeGuiMenu,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"
import type { GuiButtonProps } from "../button/gui"

interface GuiContainerProps<T extends CollectionItem>
    extends ComboboxRootProps<T>,
        GuiFormFieldContainerVariantsProps {}
export const GuiContainer = forwardRef<HTMLDivElement, GuiContainerProps<CollectionItem>>(
    ({ className = "", children, ...props }, ref) => (
        <ArkCombobox.Root ref={ref} className={cx(recipeGuiCombobox.container({}), className)} {...props}>
            {children}
            <span data-expandable-indicator="" />
        </ArkCombobox.Root>
    ),
)

interface GuiTriggerProps extends ComboboxTriggerProps, GuiButtonProps {}
export const GuiTrigger = forwardRef<HTMLButtonElement, GuiTriggerProps>(
    ({ className = "", scale, intent, aspect, shape, children, ...props }, ref) => (
        <ArkCombobox.Trigger
            ref={ref}
            className={cx(recipeGuiCombobox.trigger({ scale, intent, shape, aspect }), className)}
            {...props}
        >
            {children}
            <span data-expandable-indicator="" />
        </ArkCombobox.Trigger>
    ),
)

interface GuiContentProps extends ComboboxContentProps, GuiPanelVariantsProps {}
export const GuiContent = forwardRef<HTMLDivElement, GuiContentProps>(
    ({ className = "", coverage, demarcation, presentation, ...props }, ref) => (
        <ArkCombobox.Content
            ref={ref}
            className={cx(
                recipeGuiCombobox.content({
                    coverage,
                    demarcation,
                    presentation,
                }),
                className,
            )}
            {...props}
        />
    ),
)

interface GuiPositionerProps extends ComboboxPositionerProps, GuiComboboxPositionerVariantsProps {}
export const GuiPositioner = forwardRef<HTMLDivElement, GuiPositionerProps>(({ className = "", ...props }, ref) => (
    <ark.div
        ref={ref}
        data-scope="combobox"
        data-part="positioner"
        className={cx(recipeGuiCombobox.positioner({}), className)}
        {...props}
    />
))

interface GuiItemGroupProps extends ComboboxItemGroupProps {}
export const GuiItemGroup = forwardRef<HTMLDivElement, GuiItemGroupProps>(({ className = "", ...props }, ref) => (
    <ArkCombobox.ItemGroup ref={ref} className={className} {...props} />
))
interface GuiItemGroupLabelProps extends ComboboxItemGroupLabelProps {}
export const GuiItemGroupLabel = forwardRef<HTMLDivElement, GuiItemGroupLabelProps>(
    ({ className = "", ...props }, ref) => <ArkCombobox.ItemGroupLabel ref={ref} className={className} {...props} />,
)

interface GuiItemProps extends ComboboxItemProps {}
export const GuiItem = forwardRef<HTMLDivElement, GuiItemProps>(({ className = "", ...props }, ref) => (
    <ArkCombobox.Item ref={ref} className={cx(recipeGuiMenu.item({}), className)} {...props} />
))

interface GuiItemTextProps extends ComboboxItemTextProps {}
export const GuiItemText = forwardRef<HTMLDivElement, GuiItemTextProps>(({ className = "", ...props }, ref) => (
    <ArkCombobox.ItemText ref={ref} className={className} {...props} />
))

interface GuiItemIndicatorProps extends ComboboxItemIndicatorProps {}
export const GuiItemIndicator = forwardRef<HTMLDivElement, GuiItemIndicatorProps>(
    ({ className = "", ...props }, ref) => <ArkCombobox.ItemIndicator ref={ref} className={className} {...props} />,
)

interface GuiInputProps extends ComboboxInputProps, GuiUserInputVariantsProps {}
export const GuiInput = forwardRef<HTMLInputElement, GuiInputProps>(({ className = "", scale, ...props }, ref) => (
    <ArkCombobox.Input
        data-hds="input"
        ref={ref}
        className={cx(recipeGuiCombobox.input({ scale }), className)}
        {...props}
    />
))

interface GuiLabelProps extends ComboboxLabelProps, GuiFormFieldLabelVariantsProps {}
export const GuiLabel = forwardRef<HTMLLabelElement, GuiLabelProps>(({ className = "", scale, ...props }, ref) => (
    <ArkCombobox.Label ref={ref} className={cx(recipeGuiCombobox.label({ scale }), className)} {...props} />
))

interface GuiControlProps extends ComboboxControlProps, GuiComboboxControlVariantsProps {}
export const GuiControl = forwardRef<HTMLDivElement, GuiControlProps>(({ className = "", ...props }, ref) => (
    <ArkCombobox.Control ref={ref} className={cx(recipeGuiCombobox.control({}), className)} {...props} />
))

interface GuiClearTriggerProps extends ComboboxClearTriggerProps, GuiComboboxClearTriggerVariantsProps {}
export const GuiClearTrigger = forwardRef<HTMLButtonElement, GuiClearTriggerProps>(
    ({ scale = "sm", shape = "inline", intent, aspect, className = "", ...props }, ref) => (
        <ArkCombobox.ClearTrigger
            ref={ref}
            className={cx(
                recipeGuiCombobox.clearTrigger({
                    scale,
                    intent,
                    shape,
                    aspect,
                }),
                className,
            )}
            {...props}
        />
    ),
)
