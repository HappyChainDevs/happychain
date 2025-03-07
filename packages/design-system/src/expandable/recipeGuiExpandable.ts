import { type VariantProps, cva } from "cva"
import { coreExpandableStyle } from "./core";

/**
 * Visual pattern for expandable/collapsible elements that follow the minimalistic, retro look
 * of early graphics-based operating systems. Provides core expandable functionality that can be
 * used directly or as a base for more complex expandable components.
 * 
 * This recipe extends core expandable styles with GUI-specific styling for indicators and 
 * implements a mask-based caret icon for the expand/collapse indicator.
 * 
 * @variant `scale` - Controls the overall size dimensions 
 * 
 * @example - Basic expandable element
 * ```tsx
 * <div className={recipeGuiExpandable()}>
 *   <button>
 *     Toggle Section
 *     <span data-expandable-indicator></span>
 *   </button>
 *   <div>
 *     Content that can be shown or hidden
 *   </div>
 * </div>
 * ```

 * @note The indicator element must have the data-expandable-indicator attribute.
 * @note This recipe uses mask-icon-hds-system-gui-caret-down for the indicator icon.
 * @note This recipe is often used as a foundation for more specialized expandable components 
 *       like accordions, collapsible sections, select inputs or dropdown menus.
 */
export const recipeGuiExpandable = cva({
  base: [
    ...coreExpandableStyle,
    // -- Indicator
    //  -- Indicator: mask properties
    "**:data-expandable-indicator:mask-icon-hds-system-gui-caret-down",
    "**:data-expandable-indicator:h-full",
    "**:data-expandable-indicator:absolute",
    "**:data-expandable-indicator:top-0",
    "**:data-expandable-indicator:end-3",
    "**:data-expandable-indicator:w-3.5",    
  ],
  variants: {
    scale: {
      default: "",
      large: "",
    }
  },
  defaultVariants: {
    scale: 'default',
  },
});


export type GuiExpandableVariantsProps = VariantProps<typeof recipeGuiExpandable>
