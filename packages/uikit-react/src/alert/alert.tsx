import { forwardRef } from "react"
import { GuiButton } from "../button/gui"
import { Alert as CoreAlert } from "./core"
import { GuiActions, GuiContainer, GuiDescription, GuiIcon, GuiTitle } from "./gui"

const Root = forwardRef((_props, _ref) => {
    return null
})
const Alert = Object.assign(Root, {
    ...CoreAlert,
    Gui: {
        Root: GuiContainer,
        Actions: GuiActions,
        Description: GuiDescription,
        Title: GuiTitle,
        Icon: GuiIcon,
        ActionTrigger: GuiButton,
    },
})

Alert.displayName = "Alert"

export { Alert }
