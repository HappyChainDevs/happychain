import { useCollapsible } from "@ark-ui/react"
import type { FC } from "react"
import { Button } from "../../primitives/button/Button"
import { InlineDrawer } from "../../primitives/collapsible/InlineDrawer"

interface ClearAllPermissionsProps {
    handleClearAllPermissions: () => void
}
/**
 * Let the user clear all permissions for a given dApp.
 * Displays a verification message to confirm the action before proceeding.
 */
const ClearAllPermissions: FC<ClearAllPermissionsProps> = (props) => {
    const { handleClearAllPermissions } = props
    const api = useCollapsible()
    return (
        <InlineDrawer
            trigger={{
                label: "Clear all permissions",
                intent: "ghost-negative",
            }}
            rootContext={api}
        >
            <p className="text-neutral text-center text-xs">
                Are you sure you want to clear all permissions for this app ?
            </p>
            <div className="grid gap-2">
                <Button
                    onClick={() => {
                        handleClearAllPermissions()
                        api.setOpen(false)
                    }}
                    className="justify-center"
                    intent="outline-negative"
                >
                    Yes, clear all permissions
                </Button>
                <Button
                    intent="ghost"
                    className="opacity-75 justify-center"
                    onClick={() => {
                        api.setOpen(false)
                    }}
                >
                    Go back
                </Button>
            </div>
        </InlineDrawer>
    )
}

export { ClearAllPermissions }
