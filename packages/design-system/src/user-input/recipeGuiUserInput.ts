import { type VariantProps, cva } from "cva"
import { coreUserInputStyle } from "./core";

/**
 * Visual pattern for user input elements that mimic the minimalistic, retro look of early 
 * graphics-based operating systems. This recipe can be applied to various form controls 
 * that expect textual user input, like some inputs (with`type` attribute `text`, `number`, `email` etc.),
 * textareas, and other interactive form elements.
 * 
 * The recipe extends core user input styles with GUI-specific styling including background,
 * text formatting, placeholder styling, and borders.
 * 
 * @variant `scale` - Controls the size, padding, and height of the input 
 * @example - Various user input types using the recipe
 * ```tsx
 * <div>
 * 
 *   <input 
 *     type="text" 
 *     placeholder="Enter your name"
 *     className={recipeGuiUserInput()}
 *   />
 *   <textarea
 *     placeholder="Enter your message"
 *     className={recipeGuiUserInput({ scale: 'large' })}
 *   ></textarea>
 *   
 *   <input
 *     type="number"
 *     placeholder="0"
 *     className={recipeGuiUserInput()}
 *   />
 * </div>
 * ```
 * 
 * @note This recipe is not only for text inputs but can be applied to various form controls.
 * @note Use the 'is-hds-input' selector to target specific styling for input elements.
 * @note Placeholder text is styled with 50% opacity to distinguish it from actual input.
 */
export const recipeGuiUserInput = cva({
  base: [
    ...coreUserInputStyle,
    // background
    "bg-hds-system-skeuo-surface-default",
    // label
    "text-hds-system-gui-foreground-default font-medium font-hds-system-gui-display text-hds-system-gui-base",
    // placeholder
    "placeholder:opacity-50",
    // border
    "border-hds-system-gui-foreground-default border",
  ],
  variants: {
    scale: {
        default: "is-hds-input:min-h-7.5 is-hds-input:px-3 is-hds-input:py-1.5",
        large: "is-hds-input:min-h-8 is-hds-input:p-2",
    }
  },

  defaultVariants: {
    scale: 'default',
  },
});


export type GuiUserInputVariantsProps = VariantProps<typeof recipeGuiUserInput>
