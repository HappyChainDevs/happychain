import { useCollapsible } from "@ark-ui/react"
import type { FC } from "react"
import { Button } from "../../../primitives/button/Button"
import { InlineDrawer } from "../../../primitives/collapsible/InlineDrawer"

interface ClearAllDappsPermissionsProps {
    handleClearAllDappsPermissions: () => void
}
/**
 * Let the user clear all permissions for all dApps
 * Displays a verification message to confirm the action before proceeding.
 */
const ClearAllDappsPermissions: FC<ClearAllDappsPermissionsProps> = (props) => {
    const { handleClearAllDappsPermissions } = props
    const api = useCollapsible()
    return (
        <InlineDrawer
            trigger={{
                label: "Clear permissions for all apps",
                intent: "ghost-negative",
            }}
            rootContext={api}
        >
            <p className="text-neutral text-center text-xs">
                Are you sure you want to clear the permissions of all apps ?
            </p>
            <div className="grid gap-2">
                <Button
                    onClick={() => {
                        handleClearAllDappsPermissions()
                        api.setOpen(false)
                    }}
                    className="justify-center"
                    intent="outline-negative"
                >
                    Yes, clear all
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

export { ClearAllDappsPermissions }
