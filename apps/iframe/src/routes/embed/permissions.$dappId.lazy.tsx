import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { ClearAllPermissions } from "#src/components/interface/permissions/ClearAllPermissions"
import { ListDappPermissions } from "#src/components/interface/permissions/ListPermissions"
import { getAppPermissions } from "#src/state/permissions"
import { type AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$dappId")({
    component: DappPermissions,
})

function DappPermissions() {
    const appURL = useParams({
        from: "/embed/permissions/$dappId",
        select: (params) => decodeURI(params.dappId),
    }) as AppURL

    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const appPermissions = getAppPermissions(appURL)

    return (
        <div className="bg-base-100 pb-14">
            <div className="animate-appear">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListDappPermissions appURL={appURL} items={appPermissions} />
                {Object.keys(appPermissions).length > 0 && <ClearAllPermissions url={appURL} />}
            </div>
        </div>
    )
}
