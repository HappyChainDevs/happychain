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
        <div className="bg-base-100 grow">
            <div className="absolute inset-0 w-full max-h-[calc(100%-3rem)] overflow-y-auto">
                <h2 className="text-center bg-base-200 text-base-content font-bold p-1 text-sm">Permissions</h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListDappsWithPermissions items={listDappsWithPermissions} />

                {listDappsWithPermissions.length > 0 && (
                    <ClearAllDappsPermissions listDappsWithPermissions={listDappsWithPermissions} />
                )}
            </div>
        </div>
    )
}
