import { type HTMLArkProps, ark } from "@ark-ui/react"
import { forwardRef } from "react"
interface InputProps extends HTMLArkProps<"input"> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, children, ...rest }, ref) => {
    return <ark.input className={className} ref={ref} {...rest} />
})

Input.displayName = "Input"
