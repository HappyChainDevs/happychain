import { Dialog } from "@ark-ui/react/dialog"
import { useAtom } from "jotai"
import type { FC } from "react"
import { secondaryMenuState } from "../state"

interface DialogConfirmSignOutProps {
    handleDisconnect: () => Promise<void>
}
/**
 * Dialog permissions list
 */
const DialogConfirmSignOut: FC<DialogConfirmSignOutProps> = (props) => {
    const [state, setState] = useAtom(secondaryMenuState)
    const { handleDisconnect } = props
    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            onOpenChange={(details) => {
                setState({
                    ...state,
                    visibilityDialogSignOutConfirmation: details.open,
                })
            }}
            open={state.visibilityDialogSignOutConfirmation}
        >
            <Dialog.Positioner className="flex justify-center absolute z-[99] bottom-0 start-0 h-full w-full">
                <Dialog.Content className="bg-base-100 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit h-full inset-0 pb-3 sm:pb-0 relative overflow-y-auto w-full [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <Dialog.Title>Are you sure you want to sign out ?</Dialog.Title>
                    <Dialog.Description>You will have to sign-in again to continue using this app.</Dialog.Description>
                    <Dialog.CloseTrigger onClick={handleDisconnect}>Yes, sign me out</Dialog.CloseTrigger>
                    <Dialog.CloseTrigger>Go back</Dialog.CloseTrigger>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogConfirmSignOut }
