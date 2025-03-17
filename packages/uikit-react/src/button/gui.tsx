import { type HTMLArkProps, ark } from "@ark-ui/react"
import { type GuiButtonVariantsProps, recipeGuiButton } from "@happy.tech/design-system"
import { forwardRef } from "react"

export interface GuiButtonProps extends GuiButtonVariantsProps, HTMLArkProps<"button"> {}
export const GuiButton = forwardRef<HTMLButtonElement, GuiButtonProps>((props, ref) => {
    const { intent, scale, aspect, className, children, asChild, ...rest } = props

    return (
        <ark.button
            ref={ref}
            data-hds="button"
            className={recipeGuiButton({ aspect, scale, intent, className })}
            asChild={asChild}
            {...rest}
        >
            {children}
        </ark.button>
    )
})
