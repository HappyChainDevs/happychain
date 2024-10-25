import { useCollapsible } from "@ark-ui/react"
import { revokePermissions } from "../../../services/permissions"
import type { AppPermissions } from "../../../state/permissions"
import type { AppURL } from "../../../utils/appURL"
import { Button } from "../../primitives/button/Button"
import { InlineDrawer } from "../../primitives/collapsible/InlineDrawer"

interface ClearAllDappsPermissionsProps {
    listDappsWithPermissions: Array<[string, AppPermissions]>
}

const ClearAllDappsPermissions = ({ listDappsWithPermissions }: ClearAllDappsPermissionsProps) => {
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
                        listDappsWithPermissions.forEach((record) => {
                            const [url, dappPermissions] = record
                            revokePermissions(url as AppURL, dappPermissions)
                        })

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
