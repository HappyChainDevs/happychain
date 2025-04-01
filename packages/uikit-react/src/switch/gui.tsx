import {
    Switch as ArkSwitch,
    type SwitchControlProps,
    type SwitchRootProps,
    type SwitchThumbProps,
} from "@ark-ui/react/switch"
import {
    type GuiSwitchContainerVariantsProps,
    type GuiSwitchControlVariantsProps,
    type GuiSwitchThumbVariantsProps,
    recipeGuiSwitch,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"

interface GuiContainerProps extends SwitchRootProps, GuiSwitchContainerVariantsProps {}
export const GuiContainer = forwardRef<HTMLLabelElement, GuiContainerProps>(
    ({ className = "", scale, ...props }, ref) => (
        <ArkSwitch.Root ref={ref} className={cx(recipeGuiSwitch.container({ scale }), className)} {...props} />
    ),
)

interface GuiControlProps extends SwitchControlProps, GuiSwitchControlVariantsProps {}
export const GuiControl = forwardRef<HTMLDivElement, GuiControlProps>(
    ({ intent, scale, className = "", ...props }, ref) => (
        <ArkSwitch.Control ref={ref} className={cx(recipeGuiSwitch.control({ intent, scale }), className)} {...props} />
    ),
)

interface GuiThumbProps extends SwitchThumbProps, GuiSwitchThumbVariantsProps {}
export const GuiThumb = forwardRef<HTMLDivElement, GuiThumbProps>(
    ({ className = "", intent, scale, ...props }, ref) => (
        <ArkSwitch.Thumb ref={ref} className={cx(recipeGuiSwitch.thumb({ intent, scale }), className)} {...props} />
    ),
)
