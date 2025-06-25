import { useCollapsible } from "@ark-ui/react"
import { Button } from "#src/components/primitives/button/Button"
import { InlineDrawer } from "#src/components/primitives/collapsible/InlineDrawer"
import { clearAppPermissions } from "#src/state/permissions"
import type { AppPermissions } from "#src/state/permissions/types"
import type { AppURL } from "#src/utils/appURL"

interface ClearAllDappsPermissionsProps {
    listDappsWithPermissions: Array<[string, AppPermissions]>
}

export const ClearAllAppsPermissions = ({ listDappsWithPermissions }: ClearAllDappsPermissionsProps) => {
    const api = useCollapsible()
    return (
        <InlineDrawer
            trigger={{
                label: "Clear permissions for all apps",
                intent: "ghost-negative",
            }}
            rootContext={api}
        >
            <p className="text-base-content text-center text-xs">
                Are you sure you want to clear the permissions of all apps ?
            </p>
            <div className="grid gap-2">
                <Button
                    onClick={() => {
                        listDappsWithPermissions.forEach((record) => {
                            const [url] = record
                            clearAppPermissions(url as AppURL)
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
