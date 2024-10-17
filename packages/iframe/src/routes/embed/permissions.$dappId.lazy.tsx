import type { HTTPString } from "@happychain/common"
import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { ClearAllPermissions } from "../../components/interface/permissions/ClearAllPermissions"
import { ListDappPermissions } from "../../components/interface/permissions/ListPermissions"
import { useGetDappPermissions } from "../../components/interface/permissions/use-dapp-permissions"

export const Route = createLazyFileRoute("/embed/permissions/$dappId")({
    component: DappPermissions,
})

function DappPermissions() {
    const dappUrl = useParams({
        from: "/embed/permissions/$dappId",
        select: (params) => decodeURI(params.dappId),
    })

    const { queryGetDappPermissions } = useGetDappPermissions(dappUrl as HTTPString)
    return (
        <div className="absolute animate-appear inset-0 w-full overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(100%-3rem)] ">
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListDappPermissions dappUrl={dappUrl as HTTPString} query={queryGetDappPermissions} />

                {queryGetDappPermissions?.data &&
                    (Object.keys(queryGetDappPermissions?.data?.permissions as object).length ?? 0) > 0 && (
                        <ClearAllPermissions
                            handleClearAllPermissions={() => {
                                // @todo - update once permissions refactor is complete
                                /*
                                Object.keys(queryGetDappPermissions?.data?.permissions as object).forEach((record) => {
                                    revokePermissions("")
                                })
                                 */
                            }}
                        />
                    )}
            </div>
        </div>
    )
}
