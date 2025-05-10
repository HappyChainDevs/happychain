import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { ClearAllPermissions } from "#src/components/interface/permissions/ClearAllPermissions"
import { ListDappPermissions } from "#src/components/interface/permissions/ListPermissions"
import { getAppPermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$dappId")({
    component: DappPermissions,
})

function DappPermissions() {
    const appURL = useParams({
        from: "/embed/permissions/$dappId",
        select: (params) => decodeURI(params.dappId),
    })
    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const listAppPermissions = getAppPermissions(appURL as AppURL)
    return (
        <div className="bg-base-100 pb-14">
            <div className="animate-appear">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListDappPermissions dappUrl={appURL as AppURL} items={listAppPermissions} />
                {Object.keys(listAppPermissions).length > 0 && <ClearAllPermissions url={appURL as AppURL} />}
            </div>
        </div>
    )
}
