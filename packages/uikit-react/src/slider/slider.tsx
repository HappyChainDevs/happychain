import { Slider as ArkSlider } from "@ark-ui/react/slider"
import {
    SkeuoContainer,
    SkeuoControl,
    SkeuoLabel,
    SkeuoMarker,
    SkeuoMarkerGroup,
    SkeuoThumb,
    SkeuoTrack,
} from "./skeuo"

/**
 * A control element that allows the user to select a single/multiple values from a given range.
 * @see {@link https://ark-ui.com/react/docs/components/slider} API Reference
 *
 * @example - Skeuomorphic slider
 * import { Slider } from '@happy.tech/uikit-react';
 * import { useState } from 'react'
 *
 * const ControlledSlider = () => {
 *  return (
 *     <Slider.Skeuo.Root
 *       value={value}
 *       onValueChange={(details: { value: SetStateAction<number[]> }) => setValue(details.value)}
 *       className='flex flex-col-reverse'>
 *       <Slider.Skeuo.Label aspect="hidden">Move slider around to do things</Slider.Skeuo.Label>
 *       <Slider.Skeuo.Control>
 *         <Slider.Skeuo.Track >
 *           <Slider.Skeuo.Range />
 *         </Slider.Skeuo.Track>
 *         <Slider.Skeuo.Thumb index={0}>
 *           <Slider.Skeuo.HiddenInput />
 *         </Slider.Skeuo.Thumb>
 *       </Slider.Skeuo.Control>
 *       <Slider.Skeuo.MarkerGroup className='**:data-[part=marker]:before:h-2.5'>
 *         <Slider.Skeuo.Marker value={0}/>
 *         <Slider.Skeuo.Marker value={25}/>
 *         <Slider.Skeuo.Marker value={50}/>
 *         <Slider.Skeuo.Marker value={75}/>
 *         <Slider.Skeuo.Marker value={100}/>
 *       </Slider.Skeuo.MarkerGroup>
 *     </Slider.Skeuo.Root>
 *   );
 * }
 */

const Slider = Object.assign({
    Skeuo: {
        ...ArkSlider,
        Root: SkeuoContainer,
        Control: SkeuoControl,
        Label: SkeuoLabel,
        Marker: SkeuoMarker,
        MarkerGroup: SkeuoMarkerGroup,
        Thumb: SkeuoThumb,
        Track: SkeuoTrack,
    },
    ...ArkSlider,
})

Slider.displayName = "Slider"

export { Slider }
