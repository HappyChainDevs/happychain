import { cva, type VariantProps } from "cva"

/**
 * Visual pattern for panel containers that mimic the minimalistic, retro look of early
 * graphics-based operating systems. Panels are container elements that appear after user
 * interaction and display additional interactive elements.
 * 
 * A panel is not visible by default and appears after being triggered by a user action.
 * 
 * @variant `coverage` - Controls how much of the screen the panel covers 
 * @variant `demarcation` - Controls the opacity of the panel border 
 * @variant `presentation` - Controls how the panel relates to other elements
 *
 * @example - Basic panel attached to a trigger element
 * ```tsx
 * <div>
 *   <button id="panel-trigger">Open Panel</button>
 *   <div 
 *     className={recipeGuiPanel()} 
 *     aria-labelledby="panel-trigger"
 *   >
 *     <div>Panel content goes here</div>
 *     <button>Option 1</button>
 *     <button>Option 2</button>
 *   </div>
 * </div>
 * ```
 * 
 * @note Panels should be associated with their trigger elements using aria-labelledby or aria-describedby for accessibility.
 * @note Use appropriate JavaScript to control the visibility of panels based on user interaction.
 */
export const recipeGuiPanel = cva({
    base: 'border',
    variants: {
      // Whether or not the panel covers the majority of the main screen or not (default behavuour)
      coverage: {
        default: 'bg-hds-system-gui-surface-default',
      },
      demarcation: {
        default: 'border-opacity-100',
        dimmed: 'border-opacity-50',
      },
      // Whether or not the panel is :
      // - displayed on top of an overlay
      // - attached to an element (default behaviour)
      // - detached from its trigger element
      presentation: {
        default: 'border-hds-system-gui-foreground-default',
        overlayed: 'border-hds-system-gui-foreground-default',
        detached: 'border-transparent',
      },
    },
    defaultVariants: {
      coverage: 'default',
      presentation: 'default',
    },
  })
  
export type GuiPanelVariantsProps = VariantProps<typeof recipeGuiPanel>