import { Alert, Dialog } from "@happy.tech/uikit-react"
import { Msgs } from "@happy.tech/wallet-common"
import { useAtom } from "jotai"
import { useActiveConnectionProvider } from "#src/connections/initialize"
import { appMessageBus } from "#src/services/eventBus"
import { dialogConfirmLogOutVisibility, userDetailsCollapsibleVisibility } from "#src/v2/layouts/root/user"

export function useConfirmLogout() {
    const activeProvider = useActiveConnectionProvider()
    const confirmLogOutVisibility = useAtom(dialogConfirmLogOutVisibility)
    const [, setConfirmLogOutVisible] = confirmLogOutVisibility
    const [, setDetailsVisible] = useAtom(userDetailsCollapsibleVisibility)

    async function handleOnLogout() {
        // Ensure UI elements won't stay open when user reconnects in the same browsing session
        setConfirmLogOutVisible(false)
        setDetailsVisible(false)

        // Logout user
        void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
        await activeProvider?.disconnect()
    }

    return {
        confirmLogOutVisibility,
        handleOnLogout,
    }
}

export const DialogConfirmLogOut = () => {
    const {
        confirmLogOutVisibility: [dialogLogOutVisible, setDialogLogOutVisible],
        handleOnLogout,
    } = useConfirmLogout()

    return (
        <Dialog.Root
            closeOnInteractOutside={false}
            closeOnEscape={true}
            open={dialogLogOutVisible}
            onOpenChange={(details: { open: boolean | ((prev: boolean) => boolean) }) =>
                setDialogLogOutVisible(details.open)
            }
        >
            <Dialog.Gui.Backdrop className="bg-hds-system-skeuo-surface-default" />
            <Dialog.Gui.Positioner className="flex overflow-auto absolute inset-0 size-full items-center justify-center">
                <Dialog.Gui.Content className="size-full z-1 pb-2 overflow-auto bg-hds-system-skeuo-surface-default">
                    <div className="size-full flex flex-col items-center justify-center">
                        <Alert.Gui.Root intent="negative">
                            <Alert.Gui.Icon />
                            <Alert.Gui.Title>Are you sure ?</Alert.Gui.Title>
                        </Alert.Gui.Root>
                        <div className="flex pt-3 gap-2 flex-col">
                            <Dialog.Gui.CloseTrigger
                                onClick={handleOnLogout}
                                className="justify-center"
                                aspect="outline"
                            >
                                Sign out
                            </Dialog.Gui.CloseTrigger>
                            <Dialog.Gui.CloseTrigger className="justify-center">Go back</Dialog.Gui.CloseTrigger>
                        </div>
                    </div>
                </Dialog.Gui.Content>
            </Dialog.Gui.Positioner>
        </Dialog.Root>
    )
}
