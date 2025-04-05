import { type VariantProps, cva } from "cva"

const recipeGuiAlertContainer = cva({
    base: ["flex flex-col items-center"],
    variants: {
        aspect: {
            default: "",
        },
        intent: {
            default: "",
            info: "",
            warning: "",
            negative: "",
            positive: "",
        },
        scale: {
            default: "gap-3",
        },
    },
    defaultVariants: {
        aspect: "default",
        intent: "default",
        scale: "default",
    },
})
export type GuiAlertContainerVariantsProps = VariantProps<typeof recipeGuiAlertContainer>
const recipeGuiAlertIcon = cva({
    base: ["aspect-square", "[mask-position:center] [mask-size:contain] [mask-repeat:no-repeat]", "bg-current"],
    variants: {
        aspect: {
            default: "",
        },
        intent: {
            default: "text-hds-system-gui-foreground-default",
            info: "",
            warning: "",
            negative: "mask-icon-hds-system-gui-warning text-hds-system-gui-foreground-intent-negative",
            positive: "",
        },
        scale: {
            default: "size-6",
        },
    },
    defaultVariants: {
        aspect: "default",
        intent: "default",
        scale: "default",
    },
})
export type GuiAlertIconVariantsProps = VariantProps<typeof recipeGuiAlertIcon>

const recipeGuiAlertTitle = cva({
    base: ["text-center", "font-hds-system-gui-display", "font-[weight:var(--font-hds-weight-normal)]"],
    variants: {
        intent: {
            default: "text-hds-system-gui-foreground-default",
            info: "text-hds-system-gui-foreground-default",
            warning: "text-hds-system-gui-foreground-default",
            positive: "text-hds-system-gui-foreground-default",
            negative: "text-hds-system-gui-foreground-default",
        },
        scale: {
            default: ["tracking-hds-loose", "text-hds-system-gui-base"],
        },
    },
    defaultVariants: {
        scale: "default",
        intent: "default",
    },
})
export type GuiAlertTitleVariantsProps = VariantProps<typeof recipeGuiAlertTitle>

const recipeGuiAlertDescription = cva({
    base: ["text-center", "font-hds-system-gui-display", "font-[weight:var(--font-hds-weight-normal)]"],
    variants: {
        intent: {
            default: "text-hds-system-gui-foreground-default",
            info: "text-hds-system-gui-foreground-default",
            warning: "text-hds-system-gui-foreground-default",
            positive: "text-hds-system-gui-foreground-default",
            negative: "text-hds-system-gui-foreground-default",
        },
        scale: {
            default: ["tracking-hds-loose", "text-hds-system-gui-base", "[&_br]:mb-1"],
        },
    },
    defaultVariants: {
        scale: "default",
        intent: "default",
    },
})
export type GuiAlertDescriptionVariantsProps = VariantProps<typeof recipeGuiAlertDescription>

const recipeGuiAlertActions = cva({
    base: ["flex flex-col justify-center"],
    variants: {
        scale: {
            default: "gap-2",
        },
    },
    defaultVariants: {
        scale: "default",
    },
})
export type GuiAlertActionsVariantsProps = VariantProps<typeof recipeGuiAlertActions>

/**
 * Visual pattern for inline alerts feedback messages that may need user attention/action.
 * Mimics the minimalistic, retro look of early graphics-based operating systems.
 *
 * This recipe consists of multiple related elements:
 * - container: The outer wrapper that provides styling and structure
 * - icon: Visual indicator of the alert type (info, warning, error, etc.)
 * - title: Optional heading for the alert
 * - description: The main message content
 * - actions: Container for buttons or other interactive elements
 *
 * @variant `intent` - Controls the semantic meaning (info, warning, negative, positive)
 * @variant `scale` - Controls the dimensions and spacing
 * @variant `aspect` - Controls the visual style (solid, faint, ghost, outline, dimmed etc.)
 *
 * @example - Basic info alert
 * ```tsx
 * <div className={recipeGuiAlert.container({ intent: "info" })}>
 *   <div className={recipeGuiAlert.title()}>Information</div>
 *   <div className={recipeGuiAlert.description()}>
 *     This is an informational message.
 *   </div>
 * </div>
 * ```
 *
 * @note For proper accessibility, use appropriate semantic elements and ARIA roles.
 */
export const recipeGuiAlert = {
    container: (props: GuiAlertContainerVariantsProps) => recipeGuiAlertContainer(props),
    actions: (props: GuiAlertActionsVariantsProps) => recipeGuiAlertActions(props),
    description: (props: GuiAlertDescriptionVariantsProps) => recipeGuiAlertDescription(props),
    title: (props: GuiAlertTitleVariantsProps) => recipeGuiAlertTitle(props),
    icon: (props: GuiAlertIconVariantsProps) => recipeGuiAlertIcon(props),
}

export type GuiAlertVariantsProps = VariantProps<typeof recipeGuiAlert.container> &
    VariantProps<typeof recipeGuiAlert.actions> &
    VariantProps<typeof recipeGuiAlert.description> &
    VariantProps<typeof recipeGuiAlert.title> &
    VariantProps<typeof recipeGuiAlert.icon>
