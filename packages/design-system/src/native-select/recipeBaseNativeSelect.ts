import { type VariantProps, cva } from "cva"
import { coreNativeSelectStyles } from "./core"

export const recipeBaseNativeSelect = cva({
    base: coreNativeSelectStyles,
})

export type NativeSelectBaseVariantsProps = VariantProps<typeof recipeBaseNativeSelect>
