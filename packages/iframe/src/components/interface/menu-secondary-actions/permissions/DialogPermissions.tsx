import { Dialog } from "@ark-ui/react/dialog"
import { useAtom } from "jotai"
import type { FC } from "react"
import { secondaryMenuState } from "../state"

// @todo - get dapps list ; get permissions per dapp

/**
 * Dialog permissions list
 */
const DialogPermissions: FC = () => {
    const [state, setState] = useAtom(secondaryMenuState)

    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            open={state.visibilityDialogPermissions}
            onOpenChange={(details) =>
                setState({
                    ...state,
                    visibilityDialogPermissions: details.open,
                    visibilityMenu: !details.open,
                })
            }
        >
            <Dialog.Positioner className="flex justify-center absolute z-[99] bottom-0 start-0 h-full w-full">
                <Dialog.Content className="bg-base-100 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit h-full inset-0 pb-3 sm:pb-0 relative overflow-y-auto w-full [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <Dialog.Title>Permissions</Dialog.Title>
                    <Dialog.Description>Permissions list</Dialog.Description>
                    <Dialog.CloseTrigger>
                        <span className="sr-only">Back to menu</span>
                    </Dialog.CloseTrigger>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogPermissions }
