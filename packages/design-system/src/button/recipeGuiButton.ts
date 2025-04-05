import { type VariantProps, cva } from "cva"
import { coreButtonStyles } from "./core"

/**
 * Visual pattern for button-like elements that mimic the minimalistic, retro look of early graphics-based
 * operating systems.
 *
 * @variant `intent` - Controls the semantic meaning and text color
 * @variant `aspect` - Controls the visual style
 * @variant `scale` - Controls the dimensions
 *
 * @example - Basic GUI button
 * ```tsx
 * <button className={recipeGuiButton()}>Save File</button>
 * ```
 * @example -  Negative intent button with ghost aspect
 * ```tsx
 * <button className={recipeGuiButton({
 *   intent: 'negative',
 *   aspect: 'ghost'
 * })}>
 *   Delete File
 * </button>
 * ```
 *
 * @note The GUI style is designed to work within skeuomorphic parent elements in the Happy wallet.
 * @note For consistent appearance across the application, use the predefined variants
 *       rather than overriding with custom classes.
 */
export const recipeGuiButton = cva({
    base: [...coreButtonStyles, "font-hds-system-gui-display tracking-hds-loose"],

    variants: {
        intent: {
            default: "text-hds-system-gui-foreground-default",
            negative: "text-hds-system-gui-foreground-intent-negative",
        },
        aspect: {
            default: "",
            outline: "border-current",
            ghost: "bg-transparent hover:bg-current/10",
            underline: "underline hover:no-underline focus:no-underline focus:bg-current/5",
        },
        scale: {
            default: "text-hds-system-gui-base",
            sm: "text-[0.7895em]",
        },
        shape: {
            brick: "",
            inline: "",
        },
    },
    compoundVariants: [
        {
            shape: "inline",
            class: "p-0.5",
        },
        {
            scale: "default",
            shape: "brick",
            class: "px-3 py-1.5",
        },
        {
            scale: "sm",
            shape: "brick",
            class: "px-[0.9em] py-[0.375em]",
        },
        {
            aspect: "outline",
            scale: "default",
            class: "border",
        },
        {},
    ],
    defaultVariants: {
        intent: "default",
        aspect: "default",
        scale: "default",
        shape: "brick",
    },
})

export type GuiButtonVariantsProps = VariantProps<typeof recipeGuiButton>
