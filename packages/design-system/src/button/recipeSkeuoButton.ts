import { type VariantProps, cva } from "cva"
import { coreButtonStyles } from "./core"

/**
 * Visual pattern for button-like elements that mimic physical, real-world objects with textures,
 * shadows, and gradients. Most commonly used in the Happy wallet.
 *
 * This recipe consists of multiple nested elements that create a realistic 3D effect:
 * - parent: Overall container that extends core button styles
 * - cuttout: Outer frame with beveled edges
 * - positioner: Handles element positioning
 * - texture: Creates material appearance with textures and lighting effects
 * - recess: Provides depression/elevation effect
 * - label: Text styling for the button content
 * - interactiveElement: The actual interactive button that receives focus
 *
 * @variant `intent` - Controls the semantic meaning, colors, and textures
 * @variant `scale` - Controls the dimensions and spacing
 * @variant `depth` - Controls the intensity of 3D effects (on recess element)
 * @variant `justifyContent` - Controls the horizontal alignment of label content
 * @variant `alignItems` - Controls the vertical alignment of label content
 *
 * @example - Skeuomorphic link button with custom label alignment
 * ```tsx
 * <div className={recipeSkeuoButton.parent()}>
 *   <span
 *     data-part="cuttout"
 *     className={recipeSkeuoButton.cuttout({ intent: 'default', scale: 'default' })}
 *   >
 *     <span
 *       data-part="texture"
 *       className={recipeSkeuoButton.texture({ intent: 'default', scale: 'default' })}
 *     >
 *       <span data-part="positioner" className={recipeSkeuoButton.positioner()}>
 *         <span
 *           className={recipeSkeuoButton.label({
 *             justifyContent: 'start',
 *             alignItems: 'baseline'
 *           })}
 *           id="link-id"
 *           aria-hidden={true}
 *           data-part="label"
 *         >
 *           View Details
 *         </span>
 *         <span
 *           data-part="recess"
 *           className={recipeSkeuoButton.recess({ intent: 'default', scale: 'default', depth: 'default' })}
 *         />
 *
 *           href="/details"
 *           data-part="interactive-element"
 *           className={recipeSkeuoButton.interactiveElement()}
 *           aria-labelledby="link-id"
 *         >
 *           View Details
 *         </a>
 *       </span>
 *     </span>
 *   </span>
 * </div>
 * ```
 *
 * @note The skeuomorphic style is built using multiple specialized layers,
 *       each contributing to the 3D effect.
 * @note Always maintain the proper nesting structure to preserve the visual effects.
 * @note The actual interactive element is visually hidden but accessible for screen readers.
 * @note Use `data-part` attributes to help identify the purpose of each element in the DOM tree.
 */
export const recipeSkeuoButton = {
    // Overall container
    parent: cva({
        base: [...coreButtonStyles],
    }),

    // Outer frame of the button with beveled edges
    cuttout: cva({
        base: ["size-full", "isolate", "block", "relative "],
        variants: {
            intent: {
                default: [
                    "bg-hds-system-skeuo-surface-150/70",
                    "focus-within:bg-hds-system-skeuo-surface-150",
                    "shadow-[var(--shadow-hds-bevel-100),var(--shadow-hds-inwards-100),var(--shadow-hds-inwards-400)]",
                ],
            },
            scale: {
                default: "p-0.5 rounded-hds-lg",
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
        },
    }),

    positioner: cva({
        base: ["relative inline-flex items-center z-10 size-full"],
    }),
    // Material appearance with texture and lighting effects
    texture: cva({
        base: [
            "relative size-full block",
            "before:absolute",
            "before:inset-0 before:block before:size-full before:content-[' ']",
            "after:absolute after:inset-0 after:block after:size-full after:content-[' ']",
            "before:mix-blend-overlay",
            "after:mix-blend-overlay",
        ],
        variants: {
            intent: {
                default: [
                    "bg-hds-system-skeuo-surface-200",
                    "before:[background:var(--texture-hds-metal)]",
                    "before:opacity-50",
                    "after:shadow-[var(--shadow-hds-rim-top),var(--shadow-hds-inwards-directional-bottom-depth),var(--shadow-hds-inwards-directional-top-lit)]",
                ],
            },
            scale: {
                default: ["p-0.5 rounded-[inherit]", "before:rounded-[inherit]", "after:rounded-[inherit]"],
            },
        },
        defaultVariants: {
            scale: "default",
            intent: "default",
        },
    }),

    // Inner depression/elevation effect
    recess: cva({
        base: ["block size-full absolute inset-0", "mix-blend-overlay", "opacity-55"],
        variants: {
            depth: {
                default: "blur-[2px]",
            },
            scale: {
                default: "rounded-full",
            },
            intent: {
                default: "bg-gradient-hds-system-skeuo-concave ",
            },
        },
        defaultVariants: {
            depth: "default",
            intent: "default",
            scale: "default",
        },
    }),

    // Label
    label: cva({
        base: [
            "uppercase w-full inline-flex items-center font-hds-system-skeuo-embossed tracking-hds-loose font-medium",
        ],
        variants: {
            justifyContent: {
                start: "justify-start",
                center: "justify-center",
                end: "justify-end",
            },
            alignItems: {
                center: "items-center",
                baseline: "items-baseline",
            },
            intent: {
                default: "text-hds-system-skeuo-foreground-default",
            },
            scale: {
                default: "text-hds-system-skeuo-base",
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
            alignItems: "center",
            justifyContent: "center",
        },
    }),

    // The actual interactive element
    interactiveElement: cva({
        base: ["cursor-pointer", "absolute z-10 block inset-0 size-full", "sr-only"],
    }),
}

export type SkeuoButtonVariantsProps = VariantProps<typeof recipeSkeuoButton.cuttout> &
    VariantProps<typeof recipeSkeuoButton.texture> &
    VariantProps<typeof recipeSkeuoButton.positioner> &
    VariantProps<typeof recipeSkeuoButton.recess> &
    VariantProps<typeof recipeSkeuoButton.label> &
    VariantProps<typeof recipeSkeuoButton.interactiveElement>
