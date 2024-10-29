import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { ClearAllPermissions } from "#src/components/interface/permissions/ClearAllPermissions"
import { ListDappPermissions } from "#src/components/interface/permissions/ListPermissions"
import { useGetDappPermissions } from "#src/components/interface/permissions/useGetDappPermissions"
import type { AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$dappId")({
    component: DappPermissions,
})

function DappPermissions() {
    const dappUrl = useParams({
        from: "/embed/permissions/$dappId",
        select: (params) => decodeURI(params.dappId),
    })
    const listAppPermissions = useGetDappPermissions(dappUrl as AppURL)
    return (
        <div className="bg-base-100 grow">
            <div className="absolute animate-appear inset-0 w-full overflow-hidden">
                <h2 className="text-center bg-base-200 text-base-content font-bold p-1 text-sm">{dappUrl}</h2>
                <div className="overflow-y-auto max-h-[calc(100%-3rem)] ">
                    <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                    <ListDappPermissions dappUrl={dappUrl as AppURL} items={listAppPermissions} />
                    {Object.keys(listAppPermissions).length > 0 && <ClearAllPermissions url={dappUrl as AppURL} />}
                </div>
            </div>
        </div>
    )
}
