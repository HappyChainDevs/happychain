import type { HTMLArkProps } from "@ark-ui/react/factory"
import type { VariantProps } from "class-variance-authority"
import { forwardRef } from "react"
import { recipeInput } from "./variant"

type InputVariantsProps = VariantProps<typeof recipeInput>

interface InputProps extends InputVariantsProps, HTMLArkProps<"input"> {
    wrapperClass?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, _ref) => {
    const { className, wrapperClass, scale, intent, placeholder, type, ...inputProps } = props

    return (
        <div className={`relative ${wrapperClass}`}>
            <input
                {...inputProps}
                className={`${recipeInput({ scale, intent, class: `peer ${className}` })}`}
                placeholder={placeholder}
                type={type}
            />
        </div>
    )
})
