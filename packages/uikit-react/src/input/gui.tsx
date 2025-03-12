import { type HTMLArkProps, ark } from "@ark-ui/react/factory"
import { type GuiUserInputVariantsProps, recipeGuiUserInput } from "@happy.tech/design-system"
import { forwardRef } from "react"

export interface GuiInputProps extends GuiUserInputVariantsProps, HTMLArkProps<"input"> {}

export const GuiInput = forwardRef<HTMLInputElement, GuiInputProps>((props, ref) => {
    const { scale, className, ...rest } = props
    return <ark.input data-hds="input" className={recipeGuiUserInput({ scale, className })} ref={ref} {...rest} />
})
