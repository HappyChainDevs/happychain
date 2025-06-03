import { createLazyFileRoute } from "@tanstack/react-router"
import { ClearAllAppsPermissions } from "#src/components/interface/permissions/ClearAllAppsPermissions"
import { ListAppsWithPermissions } from "#src/components/interface/permissions/ListAppsWithPermissions"
import { useAppsWithPermissions } from "#src/components/interface/permissions/useAppsWithPermissions"

export const Route = createLazyFileRoute("/embed/permissions/")({
    component: Permissions,
})

function Permissions() {
    const appsWithPermissions = useAppsWithPermissions()

    return (
        <>
            <div className="pb-14 relative">
                <h2 className="sticky z-10 top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    Permissions
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListAppsWithPermissions items={appsWithPermissions} />
                {appsWithPermissions.length > 0 && (
                    <ClearAllAppsPermissions listDappsWithPermissions={appsWithPermissions} />
                )}
            </div>
        </>
    )
}
