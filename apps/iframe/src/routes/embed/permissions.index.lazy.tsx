import { createLazyFileRoute } from "@tanstack/react-router"
import { ClearAllDappsPermissions } from "#src/components/interface/permissions/ClearAllDappsPermissions"
import { ListDappsWithPermissions } from "#src/components/interface/permissions/ListDappsWithPermissions"
import { useGetAllDappsWithPermissions } from "#src/components/interface/permissions/useGetAllDappsWithPermissions"

export const Route = createLazyFileRoute("/embed/permissions/")({
    component: Permissions,
})

function Permissions() {
    const listDappsWithPermissions = useGetAllDappsWithPermissions()

    return (
        <>
            <div className="bg-base-100 pb-14 relative">
                <h2 className="sticky z-10 top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    Permissions
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListDappsWithPermissions items={listDappsWithPermissions} />
                {listDappsWithPermissions.length > 0 && (
                    <ClearAllDappsPermissions listDappsWithPermissions={listDappsWithPermissions} />
                )}
            </div>
        </>
    )
}
