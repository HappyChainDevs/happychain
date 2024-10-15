import { type HTMLArkProps, ark } from "@ark-ui/react"
import { Spinner } from "@phosphor-icons/react"
import { forwardRef } from "react"
import { type ButtonVariantsProps, recipeButton } from "./variants"

interface ButtonProps extends ButtonVariantsProps, HTMLArkProps<"button"> {
    isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ scale, intent, className, isLoading, children, ...rest }, ref) => {
        return (
            <ark.button className={recipeButton({ scale, intent, className })} ref={ref} {...rest}>
                {isLoading && (
                    <span data-loader className="pe-1">
                        <Spinner className="animate-spin text-[1.25em]" />
                    </span>
                )}
                {children}
            </ark.button>
        )
    },
)

Button.displayName = "Button"
export { recipeButton, Button, type ButtonVariantsProps }
