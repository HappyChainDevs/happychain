import { cva, cx, type VariantProps } from "cva";
import { recipeGuiPanel } from "../panel";

const recipeGuiMenuContent = cva({
    base: [
        "size-full max-h-[29vh] flex flex-col overflow-y-auto",
    ],
})

export type GuiMenuContentVariantsProps = VariantProps<typeof recipeGuiMenuContent>

const recipeGuiMenuTrigger = cva({
    base: "font-hds-system-gui-display cursor-pointer is-disabled:cursor-not-allowed",
    variants: {
        aspect: {
            default: "text-hds-system-gui-foreground-default",
            dimmed: "text-hds-system-gui-foreground-default/50 data-[state=open]:text-hds-system-gui-foreground-default"
        }
    }
})

export type GuiMenuTriggerVariantsProps = VariantProps<typeof recipeGuiMenuTrigger>

const recipeGuiMenuItem = cva({
    base: [
        'cursor-pointer ',
        'tracking-hds-loose',
        'font-hds-system-gui-display',
        'text-hds-system-gui-foreground-default',
        'inline-flex justify-between items-baseline'
    ],
    variants: {
        intent: {
            default: '[&_[data-part=icon]]:text-inherit',
            negative: '[&_[data-part=icon]]:text-hds-system-gui-foreground-intent-negative'
        },
        scale: {
            default: 'p-2 text-hds-system-gui-base gap-3'
        }
    },
    defaultVariants: {
        intent: 'default',
        scale: 'default'
    }
})

export type GuiMenuItemVariantsProps = VariantProps<typeof recipeGuiMenuItem>


/**
 * Visual pattern for dropdown menu components that mimic the minimalistic, retro look of early
 * graphics-based operating systems. Creates a complete menu system with trigger, content panel,
 * and selectable items.
 * 
 * This recipe consists of multiple related elements:
 * - trigger: The interactive element that opens/closes the menu
 * - content: The container that holds menu items (extends GuiPanel)
 * - item: Individual selectable options within the menu
 * 
 * @variant `aspect` (trigger) - Controls the visual style of the trigger * 
 * @variant `intent` (item) - Controls the semantic meaning of menu items
 * @variant `scale` (item) - Controls the size and spacing of menu items
 * @example - Complete menu with trigger and items
 * ```tsx
 * <div>
 *   <button className={recipeGuiMenu.trigger({ aspect: 'default' })}>
 *     Options
 *   </button>
 *   <div className={recipeGuiMenu.content()}>
 *     <div className={recipeGuiMenu.item()}>
 *       New file
 *       <span data-part="icon">+</span>
 *     </div>
 *     <div className={recipeGuiMenu.item()}>Open</div>
 *     <div className={recipeGuiMenu.item()}>Save</div>
 *     <div className={recipeGuiMenu.item({ intent: 'negative' })}>
 *       Delete
 *       <span data-part="icon">x</span>
 *     </div>
 *   </div>
 * </div>
 * ```
 * 
 * @note The content element has a maximum height and vertical scrolling for overflow.
 * @note Use data-part="icon" on elements within menu items that should inherit special styling.
 * @note The trigger element supports a data-state="open" attribute to indicate open state.
 */
export const recipeGuiMenu = {
    trigger: (props: GuiMenuTriggerVariantsProps) => recipeGuiMenuTrigger(props),
    content: (props: GuiMenuContentVariantsProps) => {
        return cx(
        recipeGuiPanel(),
        recipeGuiMenuContent(props)
    )},
    item: (props: GuiMenuItemVariantsProps) => recipeGuiMenuItem(props)
};

export type GuiMenuVariantsProps = 
  VariantProps<typeof recipeGuiMenu.content> & 
  VariantProps<typeof recipeGuiMenu.item> & 
  VariantProps<typeof recipeGuiMenu.trigger>;