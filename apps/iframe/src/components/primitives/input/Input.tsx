import { type HTMLArkProps, ark } from "@ark-ui/react"
import type { VariantProps } from "class-variance-authority"
import { forwardRef } from "react"
import { recipeTextInput } from "./variants"

type InputVariantsProps = VariantProps<typeof recipeTextInput>
interface InputProps extends InputVariantsProps, HTMLArkProps<"input"> {
    inputClass?: string
    wrapperClass?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
    const { scale, intent, inputClass, wrapperClass, ...rest } = props
    return (
        <div className={`relative w-full ${wrapperClass ?? ""}`}>
            <ark.input
                className={`${recipeTextInput({ scale: scale, intent: intent, className: inputClass })}`}
                placeholder={rest?.placeholder ?? ""}
                type={rest?.type ?? "text"}
                ref={ref}
                {...rest}
            />
        </div>
    )
})

Input.displayName = "Input"