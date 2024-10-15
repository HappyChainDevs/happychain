import { Menu } from "@ark-ui/react/menu"
import { CaretDown, CaretRight, CaretUp } from "@phosphor-icons/react"
import { useAtom } from "jotai"
import type { FC } from "react"
import { recipeContent, recipePositioner } from "../../primitives/popover/variants"
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
            {state.visibilityMenu ? <CaretUp size="1.25em" /> : <CaretDown size="1.25em" />}
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
            <div
                className={recipePositioner({
                    originY: "bottom",
                    mode: "modal",
                })}
            >
                <Menu.Content
                    className={recipeContent({
                        scale: "default",
                        intent: "default",
                        animation: "modal",
                        class: "py-2 sm:pb-0 [&_[data-part=item]]:inline-flex [&_[data-part=item]]:gap-2 [&_[data-part=item]]:items-center [&_[data-part=item]]:justify-between [&_[data-part=item]]:not([data-disabled])]:cursor-pointer &_[data-part=item][data-disabled]]:cursor-not-allowed [&_[data-part=item]]:p-2 [&_[data-part=item]]:font-medium [&_[data-part=item][data-highlighted]]:bg-base-200",
                    })}
                >
                    <Menu.Item value={MenuActions.Permissions}>
                        <span>Permissions</span>
                        <CaretRight size="1em" />
                    </Menu.Item>
                    <Menu.Item value={MenuActions.Disconnect}>Disconnect</Menu.Item>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { SecondaryActionsMenu, TriggerSecondaryActionsMenu }
