import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { useState } from "react"
import { ClearSingleAppPermissions } from "#src/components/interface/permissions/ClearSingleAppPermissions"
import { ListSingleAppPermissions } from "#src/components/interface/permissions/ListSingleAppPermissions"
import { getAppPermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$appURL")({
    component: DappPermissions,
})

function DappPermissions() {
    const appURL = useParams({
        from: "/embed/permissions/$appURL",
        select: (params) => decodeURI(params.appURL),
    }) as AppURL

    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const [appPermissions] = useState(getAppPermissions(appURL))

    // TODO Create a usePermissionsHook, use it here to non-destructively extend the initial app permissions.
    //      This would enable showing new permissions if the user is on the permissions screen, minimizes the wallet,
    //      and then adds new permissions. Not a huge priority, granting permissions is rare.

    return (
        <div className="bg-base-100 pb-14">
            <div className="animate-appear">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListSingleAppPermissions appURL={appURL} items={appPermissions} />
                {Object.keys(appPermissions).length > 0 && <ClearSingleAppPermissions url={appURL} />}
            </div>
        </div>
    )
}
