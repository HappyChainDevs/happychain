import {
    Slider as ArkSlider,
    type SliderControlProps,
    type SliderLabelProps,
    type SliderMarkerGroupProps,
    type SliderMarkerProps,
    type SliderRootProps,
    type SliderThumbProps,
    type SliderTrackProps,
} from "@ark-ui/react/slider"
import {
    type SkeuoSliderControlVariantsProps,
    type SkeuoSliderLabelVariantsProps,
    type SkeuoSliderMarkerGroupVariantsProps,
    type SkeuoSliderMarkerVariantsProps,
    type SkeuoSliderThumbVariantsProps,
    type SkeuoSliderTrackVariantsProps,
    recipeSkeuoSlider,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"

interface SkeuoContainerProps extends SliderRootProps {}
export const SkeuoContainer = forwardRef<HTMLDivElement, SkeuoContainerProps>(({ className = "", ...props }, ref) => (
    <ArkSlider.Root ref={ref} className={className} {...props} />
))

interface SkeuoLabelProps extends SliderLabelProps, SkeuoSliderLabelVariantsProps {}
export const SkeuoLabel = forwardRef<HTMLLabelElement, SkeuoLabelProps>(({ className = "", aspect, ...props }, ref) => (
    <ArkSlider.Label ref={ref} className={cx(recipeSkeuoSlider.label({ aspect }), className)} {...props} />
))

interface SkeuoControlProps extends SliderControlProps, SkeuoSliderControlVariantsProps {}
export const SkeuoControl = forwardRef<HTMLDivElement, SkeuoControlProps>(
    ({ intent, scale, className = "", ...props }, ref) => (
        <ArkSlider.Control
            ref={ref}
            className={cx(recipeSkeuoSlider.control({ intent, scale }), className)}
            {...props}
        />
    ),
)

interface SkeuoTrackProps extends SliderTrackProps, SkeuoSliderTrackVariantsProps {}
export const SkeuoTrack = forwardRef<HTMLDivElement, SkeuoTrackProps>(({ className = "", ...props }, ref) => (
    <ArkSlider.Track ref={ref} className={cx(recipeSkeuoSlider.track({}), className)} {...props} />
))

interface SkeuoThumbProps extends SliderThumbProps, SkeuoSliderThumbVariantsProps {}
export const SkeuoThumb = forwardRef<HTMLDivElement, SkeuoThumbProps>(
    ({ className = "", intent, scale, ...props }, ref) => (
        <ArkSlider.Thumb ref={ref} className={cx(recipeSkeuoSlider.thumb({ intent, scale }), className)} {...props} />
    ),
)

interface SkeuoMarkerGroupProps extends SliderMarkerGroupProps, SkeuoSliderMarkerGroupVariantsProps {}
export const SkeuoMarkerGroup = forwardRef<HTMLDivElement, SkeuoMarkerGroupProps>(
    ({ className = "", scale, ...props }, ref) => (
        <ArkSlider.MarkerGroup
            ref={ref}
            className={cx(recipeSkeuoSlider.markerGroup({ scale }), className)}
            {...props}
        />
    ),
)

interface SkeuoMarkerProps extends SliderMarkerProps, SkeuoSliderMarkerVariantsProps {}
export const SkeuoMarker = forwardRef<HTMLDivElement, SkeuoMarkerProps>(
    ({ intent, scale, aspect, className = "", ...props }, ref) => (
        <ArkSlider.Marker
            ref={ref}
            className={cx(recipeSkeuoSlider.marker({ intent, scale, aspect }), className)}
            {...props}
        />
    ),
)
