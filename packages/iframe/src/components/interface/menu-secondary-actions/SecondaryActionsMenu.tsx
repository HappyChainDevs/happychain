import { Menu } from "@ark-ui/react/menu"
import { X as CloseIcon, DotsThreeVertical as MenuIcon } from "@phosphor-icons/react"
import { useAtom } from "jotai"
import type { FC } from "react"
import { secondaryMenuState } from "./state"

/**
 * Trigger button for the secondary menu. Controls secondary menu visibility state.
 */
const TriggerSecondaryActionsMenu: FC = () => {
    const [state, setState] = useAtom(secondaryMenuState)
    return (
        <button
            type="button"
            aria-label="Open secondary actions menu"
            onClick={() =>
                setState({
                    ...state,
                    visibilityMenu: true,
                })
            }
        >
            {state.visibilityMenu ? <CloseIcon size="1.5em" /> : <MenuIcon size="1.5em" />}
        </button>
    )
}

enum MenuActions {
    Permissions = "permissions",
    Disconnect = "disconnect",
}
/**
 * App secondary menu. Controlled via visibility atom.
 */
const SecondaryActionsMenu: FC = () => {
    const [state, setState] = useAtom(secondaryMenuState)
    return (
        <Menu.Root
            open={state.visibilityMenu}
            onInteractOutside={() => {
                setState({
                    ...state,
                    visibilityMenu: false,
                })
            }}
            onEscapeKeyDown={() => {
                setState({
                    ...state,
                    visibilityMenu: false,
                })
            }}
            onSelect={(details: { value: string }) => {
                switch (details.value) {
                    case MenuActions.Permissions:
                        setState({
                            ...state,
                            visibilityDialogPermissions: true,
                        })
                        break

                    case MenuActions.Disconnect:
                        setState({
                            ...state,
                            visibilityDialogSignOutConfirmation: true,
                        })
                        break
                }
            }}
        >
            <div className="flex justify-center absolute z-[99] bottom-0 start-0 h-full w-full">
                <Menu.Content className="py-2 [&_[data-part=item]]:p-2 [&_[data-part=item]]:font-medium [&_[data-part=item][data-highlighted]]:bg-base-200 bg-base-100 text-sm text-neutral-11 min-h-fit h-full inset-0 pb-3 sm:pb-0 relative overflow-y-auto w-full [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <Menu.Item value={MenuActions.Permissions}>Permissions</Menu.Item>
                    <Menu.Item value={MenuActions.Disconnect}>Disconnect</Menu.Item>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { SecondaryActionsMenu, TriggerSecondaryActionsMenu }
