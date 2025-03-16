import { Alert as CoreAlert } from './core'
import { GuiContainer, GuiActions, GuiDescription, GuiIcon, GuiTitle } from "./gui"
import { GuiButton } from "../button/gui"
import { forwardRef } from 'react'

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
        ActionTrigger: GuiButton
    },
})

Alert.displayName = "Alert"

export { Alert }
