import { Dialog } from "@ark-ui/react/dialog"
import { useAtom } from "jotai"
import { recipeButton } from "#src/components/primitives/button/variants"
import { recipePositioner } from "#src/components/primitives/popover/variants"
import { dialogLogOutConfirmationVisibilityAtom } from "./state"

interface DialogConfirmLogOutProps {
    handleDisconnect: () => Promise<void>
}

const DialogConfirmLogOut = ({ handleDisconnect }: DialogConfirmLogOutProps) => {
    const [isVisible, setVisibility] = useAtom(dialogLogOutConfirmationVisibilityAtom)
    return (
        <Dialog.Root
            lazyMount
            unmountOnExit
            onOpenChange={(details) => {
                setVisibility(details.open)
            }}
            open={isVisible}
        >
            <Dialog.Positioner
                className={recipePositioner({
                    mode: "modal",
                    originY: "bottom",
                })}
            >
                <Dialog.Content className="text-center bg-base-100 p-4 lg:p-5 text-sm text-neutral-11 min-h-fit size-full inset-0 pb-3 sm:pb-0 relative [&[data-state=open]]:flex flex-col motion-safe:[&[data-state=open]]:animate-growIn motion-safe:[&[data-state=closed]]:animate-growOut">
                    <div className="my-auto grid gap-2">
                        <Dialog.Title className="font-bold text-base-content">
                            Are you sure you want to log out ?
                        </Dialog.Title>
                        <Dialog.Description className="text-content text-center text-xs">
                            You will have to log-in again to continue using this app.
                        </Dialog.Description>
                    </div>
                    <div className="mt-auto py-4 grid gap-2">
                        <Dialog.CloseTrigger
                            className={recipeButton({ intent: "outline-negative", class: "justify-center" })}
                            onClick={handleDisconnect}
                        >
                            Yes, log me out
                        </Dialog.CloseTrigger>
                        <Dialog.CloseTrigger
                            className={recipeButton({ intent: "ghost", class: "opacity-75 justify-center" })}
                        >
                            Go back
                        </Dialog.CloseTrigger>
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

export { DialogConfirmLogOut }
