import { useCollapsible } from "@ark-ui/react"
import { Button } from "#src/components/primitives/button/Button"
import { InlineDrawer } from "#src/components/primitives/collapsible/InlineDrawer"
import { clearAppPermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

interface ClearAllDappsPermissionsProps {
    url: AppURL
}

const ClearAllPermissions = ({ url }: ClearAllDappsPermissionsProps) => {
    const api = useCollapsible()
    return (
        <InlineDrawer
            trigger={{
                label: "Clear all permissions",
                intent: "ghost-negative",
            }}
            rootContext={api}
        >
            <p className="text-base-content text-center text-xs">
                Are you sure you want to clear all permissions for this app ?
            </p>
            <div className="grid gap-2">
                <Button
                    onClick={() => {
                        clearAppPermissions(url)
                        api.setOpen(false)
                    }}
                    className="justify-center"
                    intent="outline-negative"
                >
                    Yes, clear all permissions
                </Button>
                <Button
                    intent="ghost"
                    className="opacity-75 justify-center text-primary"
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
