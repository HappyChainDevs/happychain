import { type VariantProps, cva } from "cva"

const recipeGuiSwitchContainer = cva({
    base: [
        "flex flex-row-reverse items-center justify-between",
        "data-[disabled]:opacity-50 cursor-pointer data-[disabled]:cursor-not-allowed",
    ],
    variants: {
        scale: {
            default: "gap-5",
        },
    },
    defaultVariants: {
        scale: "default",
    },
})
export type GuiSwitchContainerVariantsProps = VariantProps<typeof recipeGuiSwitchContainer>

const recipeGuiSwitchControl = cva({
    base: ["flex shrink-0 items-center"],
    variants: {
        intent: {
            default: [
                "data-[state=unchecked]:border-hds-system-gui-foreground-default/40",
                "data-[state=unchecked]:bg-hds-system-gui-foreground-default/5",
                "data-[state=checked]:border-hds-system-gui-foreground-intent-positive/10",
                "data-[state=checked]:bg-hds-system-gui-foreground-intent-positive",
            ],
        },
        scale: {
            default: "w-10 h-5 ps-0.5 py-1 pe-1 border-2",
        },
    },
    defaultVariants: {
        scale: "default",
        intent: "default",
    },
})

export type GuiSwitchControlVariantsProps = VariantProps<typeof recipeGuiSwitchControl>

const recipeGuiSwitchThumb = cva({
    base: ["flex motion-safe:transition-all"],
    variants: {
        intent: {
            default: [
                "data-[state=checked]:bg-hds-system-gui-surface-default",
                "data-[state=unchecked]:bg-hds-system-gui-foreground-default/75 ",
            ],
        },
        scale: {
            default: ["size-3 data-[state=checked]:translate-x-[170%]"],
        },
    },
    defaultVariants: {
        intent: "default",
        scale: "default",
    },
})
export type GuiSwitchThumbVariantsProps = VariantProps<typeof recipeGuiSwitchThumb>

/**
 * Visual pattern for switch elements that mimic the minimalistic, retro look of early
 * graphics-based operating systems. Creates a toggle control for binary selection.
 *
 * This recipe consists of three related elements:
 * - container: The outer wrapper that contains the control and potentially a label
 * - control: The track of the switch that changes appearance based on state
 * - thumb: The sliding indicator that moves to show the switch state
 *
 * @variant `intent` (control and thumb) - Controls the semantic meaning and colors
 *   - default: Standard appearance with positive intent coloring when checked
 *
 * @variant `scale` - Controls the size and spacing of all elements
 *   - default: Standard size with appropriate dimensions and spacing
 *
 * @example - Basic switch with label
 * ```tsx
 * <label className={recipeGuiSwitch.container()}>
 *   Enable notifications
 *   <span className={recipeGuiSwitch.control()} data-state="checked">
 *     <span className={recipeGuiSwitch.thumb()} data-state="checked"></span>
 *   </span>
 *   <input type="checkbox" checked aria-hidden="true" className="sr-only" />
 * </label>
 * ```
 *
 * @note The container uses flex-row-reverse to position the switch before the label text.
 * @note The control and thumb elements respond to the data-state attribute ("checked" or "unchecked").
 * @note The thumb includes a smooth transition animation for state changes.
 * @note Use the Ark UI Switch component as the foundation for this recipe.
 */
export const recipeGuiSwitch = {
    container: (props: GuiSwitchContainerVariantsProps) => recipeGuiSwitchContainer(props),
    control: (props: GuiSwitchControlVariantsProps) => recipeGuiSwitchControl(props),
    thumb: (props: GuiSwitchThumbVariantsProps) => recipeGuiSwitchThumb(props),
}

export type GuiSwitchVariantsProps = VariantProps<typeof recipeGuiSwitch.container> &
    VariantProps<typeof recipeGuiSwitch.control> &
    VariantProps<typeof recipeGuiSwitch.thumb>
