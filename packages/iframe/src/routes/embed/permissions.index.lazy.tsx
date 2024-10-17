import { createLazyFileRoute } from "@tanstack/react-router"
import { ClearAllDappsPermissions } from "../../components/interface/permissions/ClearAllDappsPermissions"
import { ListDappsWithPermissions } from "../../components/interface/permissions/ListDappsWithPermissions"
import { useGetAllDappsWithPermissions } from "../../components/interface/permissions/use-list-dapps-with-permissions"

export const Route = createLazyFileRoute("/embed/permissions/")({
    component: Permissions,
})

function Permissions() {
    const { queryGetAllDappsWithPermissions } = useGetAllDappsWithPermissions()

    return (
        <div className="absolute inset-0 w-full max-h-[calc(100%-3rem)] overflow-y-auto">
            <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
            <ListDappsWithPermissions query={queryGetAllDappsWithPermissions} />

            {(queryGetAllDappsWithPermissions.data?.length ?? 0) > 0 && (
                <ClearAllDappsPermissions
                    handleClearAllDappsPermissions={() => {
                        // @todo - update once permissions refactor is complete
                        /*
                            queryGetAllDappsWithPermissions.data?.forEach((record) => {
                                const [url, dappPermissions] = record
                                revokePermissions("")
                            })
                        */
                    }}
                />
            )}
        </div>
    )
}
