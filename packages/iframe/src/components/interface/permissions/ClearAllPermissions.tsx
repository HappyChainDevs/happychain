import { useCollapsible } from "@ark-ui/react"
import type { FC } from "react"
import { revokePermissions } from "../../../services/permissions"
import type { AppPermissions } from "../../../state/permissions"
import type { AppURL } from "../../../utils/appURL"
import { Button } from "../../primitives/button/Button"
import { InlineDrawer } from "../../primitives/collapsible/InlineDrawer"

interface ClearAllDappsPermissionsProps {
    url: AppURL
    permissions: AppPermissions
}

const ClearAllPermissions: FC<ClearAllDappsPermissionsProps> = (props) => {
    const api = useCollapsible()
    const { url, permissions } = props
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
                        // @todo - use `revokePermissions(url, permissions)` once caveats are supported
                        Object.keys(permissions).forEach((permission) => revokePermissions(url, permission))
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
