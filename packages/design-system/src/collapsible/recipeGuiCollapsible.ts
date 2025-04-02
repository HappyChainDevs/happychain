import { type VariantProps, cva, cx } from "cva"
import { recipeGuiExpandable } from "../expandable/recipeGuiExpandable"

const recipeGuiCollapsibleContainer = cva({
    base: [
        "group",
        "relative w-full border text-hds-system-gui-foreground-default font-hds-system-gui-display",
        "**:data-expandable-indicator:absolute",
        "**:data-expandable-indicator:block",
        "**:data-expandable-indicator:top-0",
        "**:data-expandable-indicator:end-3",
        "**:data-expandable-indicator:w-3.5",
        "data-[state=open]:**:data-expandable-indicator:rotate-180",
    ],
    variants: {
        intent: {
            default: "border-hds-system-gui-foreground-default/50 text-hds-system-gui-foreground-default",
        },
        scale: {
            default: "text-hds-system-gui-base tracking-hds-loose",
        },
    },
    defaultVariants: {
        intent: "default",
        scale: "default",
    },
})

export type GuiCollapsibleContainerVariantsProps = VariantProps<typeof recipeGuiCollapsibleContainer>

const recipeGuiCollapsibleTrigger = cva({
    base: ["relative", "cursor-pointer is-disabled:cursor-not-allowed", "w-full inline-flex justify-between"],
    variants: {
        scale: {
            default: "py-2 gap-3  px-3",
        },
    },
    defaultVariants: {
        scale: "default",
    },
})

export type GuiCollapsibleTriggerVariantsProps = VariantProps<typeof recipeGuiCollapsibleTrigger>

const recipeGuiCollapsibleContent = cva({
    base: [
        "motion-safe:group-has-[&[data-state=open]]:animate-[hds-slide-down_270ms_ease-in-out]",
        "motion-safe:group-has-[&[data-state=closed]]:animate-[hds-slide-up_160ms_ease-in-out]",
        "overflow-hidden",
    ],
    variants: {
        scale: {
            default: "pb-3 px-3",
        },
    },
    defaultVariants: {
        scale: "default",
    },
})

export type GuiCollapsibleContentVariantsProps = VariantProps<typeof recipeGuiCollapsibleContent>

/**
 * Visual pattern for collapsible sections that mimic the minimalistic, retro look of early
 * graphics-based operating systems. The collapsible component allows toggling visibility
 * of content sections.
 *
 * This recipe consists of multiple related elements:
 * - container: The outer wrapper that provides styling and structure
 * - trigger: The interactive element that toggles content visibility
 * - content: The section that can be expanded or collapsed
 *
 * Under the hood, this recipe utilizes the `recipeGuiExpandable` for functionality while
 * adding specific styling and behavior for the collapsible pattern.
 *
 * @variant `intent` - Controls the semantic meaning
 * @variant `scale` - Controls the dimensions
 *
 * @example - Basic collapsible section
 * ```tsx
 * <div className={recipeGuiCollapsible.container()}>
 *   <button className={recipeGuiCollapsible.trigger()}>
 *     Section Title
 *     <span data-expandable-indicator>▼</span>
 *   </button>
 *   <div className={recipeGuiCollapsible.content()}>
 *     This content can be expanded or collapsed.
 *   </div>
 * </div>
 * ```
 * @note The indicator element must have the data-expandable-indicator attribute for proper styling.
 * @note The container combines both the collapsible styling and the expandable functionality.
 * @note For proper accessibility, use appropriate semantic elements (button for trigger).
 */
export const recipeGuiCollapsible = {
    container: (props: GuiCollapsibleContainerVariantsProps) =>
        cx(recipeGuiCollapsibleContainer(props), recipeGuiExpandable()),
    trigger: (props: GuiCollapsibleTriggerVariantsProps) => recipeGuiCollapsibleTrigger(props),
    content: (props: GuiCollapsibleContentVariantsProps) => recipeGuiCollapsibleContent(props),
}

export type GuiCollapsibleVariantsProps = VariantProps<typeof recipeGuiCollapsible.container> &
    VariantProps<typeof recipeGuiCollapsible.content> &
    VariantProps<typeof recipeGuiCollapsible.trigger>
