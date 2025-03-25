import { type VariantProps, cva } from "cva"
const recipeSkeuoSliderLabel = cva({
    variants: {
        aspect: {
            default: "",
            hidden: "sr-only",
        },
        scale: {
            default: "",
        },
        intent: {
            default: "",
        },
    },
    defaultVariants: {
        aspect: "default",
        scale: "default",
        intent: "default",
    },
})
export type SkeuoSliderLabelVariantsProps = VariantProps<typeof recipeSkeuoSliderLabel>

const recipeSkeuoSliderControl = cva({
    base: ["z-1 rounded-full"],
    variants: {
        intent: {
            default: "bg-gradient-hds-system-skeuo-surface-100-250-600 shadow-hds-bevel-200",
        },
        scale: {
            default: "h-3 px-2.25",
            intent: "default",
        },
    },
    defaultVariants: {
        scale: "default",
        intent: "default",
    },
})
export type SkeuoSliderControlVariantsProps = VariantProps<typeof recipeSkeuoSliderControl>

const recipeSkeuoSliderTrack = cva({
    base: "size-full",
    variants: {},
})
export type SkeuoSliderTrackVariantsProps = VariantProps<typeof recipeSkeuoSliderTrack>

const recipeSkeuoSliderThumb = cva({
    base: [
        "cursor-grab active:cursor-grabbing",
        "focus:outline-none",
        "motion-safe:transition-all duration-200",
        "aspect-square rounded-full",
        "absolute",
        "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:-translate-y-1/2",
        'before:absolute before:content-[" "]  before:aspect-square before:rounded-full',
        "before:top-1/2 before:start-1/2 before:-translate-y-1/2 before:-translate-x-1/2",
    ],
    variants: {
        intent: {
            default: [
                "before:bg-gradient-hds-system-skeuo-surface-700-utility-tint",
                "bg-gradient-hds-152deg-system-skeuo-surface-950-700",
                "shadow-[var(--shadow-hds-outwards-300),var(--shadow-hds-outwards-200),var(--shadow-hds-bevel-inwards-100)]",
                "active:shadow-[var(--shadow-hds-outwards-200),var(--shadow-hds-bevel-inwards-100)]",
            ],
        },
        scale: {
            default: [
                "before:h-[calc(100%-var(--spacing)*1.5)]",
                "h-[calc(100%+var(--spacing)*2.5)]",
                "active:scale-90",
            ],
        },
    },
    defaultVariants: {
        intent: "default",
        scale: "default",
    },
})
export type SkeuoSliderThumbVariantsProps = VariantProps<typeof recipeSkeuoSliderThumb>

const recipeSkeuoSliderMarkerGroup = cva({
    variants: {
        scale: {
            default: "px-4.75",
        },
    },
    defaultVariants: {
        scale: "default",
    },
})
export type SkeuoSliderMarkerGroupVariantsProps = VariantProps<typeof recipeSkeuoSliderMarkerGroup>

const recipeSkeuoSliderMarker = cva({
    base: [
        'relative before:content-[" "] before:block',
        "data-[orientation=horizontal]:before:inset-0",
        "data-[orientation=horizontal]:before:-translate-y-full ",
    ],
    variants: {
        scale: {
            default: "data-[orientation=horizontal]:before:w-0.25",
            // make sure to specify a height to the ::before pseudo element in your markup
            // otherwise the tick won't be visible
        },
        aspect: {
            default: "",
            hidden: "invisible",
        },
        intent: {
            default: "before:bg-hds-system-skeuo-surface-300 before:shadow-hds-bevel-100",
        },
    },
    defaultVariants: {
        intent: "default",
        scale: "default",
        aspect: "default",
    },
})
export type SkeuoSliderMarkerVariantsProps = VariantProps<typeof recipeSkeuoSliderMarker>

/**
 * Visual pattern for slider control elements that mimic physical, real-world objects with textures,
 * shadows, and gradients. Includes all slider elements: label, trakc, control with markers
 * and interactive thumb element.
 *
 * This recipe consists of multiple related elements:
 * - label: Text label for the slider
 * - control: The main slider container
 * - track: The track along which the thumb moves
 * - thumb: The draggable handle that sets the slider value
 * - markerGroup: Container for tick marks along the slider
 * - marker: Individual tick marks for value increments
 *
 * @variant `intent` - Controls the semantic meaning, colors, and textures
 * @variant `scale` - Controls the dimensions and spacing
 * @variant `aspect` (label and marker) - Controls visibility
 *
 * @note The thumb element has cursor-grab and cursor-grabbing styles for enhanced user feedback.
 * @note Markers require explicit height settings in their style attributes to be visible.
 * @note The thumb includes motion transitions for a smoother user experience.
 * @note Use the Ark UI Slider component as the foundation for this recipe.
 */
export const recipeSkeuoSlider = {
    label: (props: SkeuoSliderLabelVariantsProps) => recipeSkeuoSliderLabel(props),
    control: (props: SkeuoSliderControlVariantsProps) => recipeSkeuoSliderControl(props),
    track: (props: SkeuoSliderControlVariantsProps) => recipeSkeuoSliderTrack(props),
    thumb: (props: SkeuoSliderThumbVariantsProps) => recipeSkeuoSliderThumb(props),
    markerGroup: (props: SkeuoSliderMarkerGroupVariantsProps) => recipeSkeuoSliderMarkerGroup(props),
    marker: (props: SkeuoSliderMarkerVariantsProps) => recipeSkeuoSliderMarker(props),
}

export type SkeuoSliderVariantsProps = VariantProps<typeof recipeSkeuoSlider.label> &
    VariantProps<typeof recipeSkeuoSlider.control> &
    VariantProps<typeof recipeSkeuoSlider.track> &
    VariantProps<typeof recipeSkeuoSlider.thumb> &
    VariantProps<typeof recipeSkeuoSlider.markerGroup> &
    VariantProps<typeof recipeSkeuoSlider.marker>
