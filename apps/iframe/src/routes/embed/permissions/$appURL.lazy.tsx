import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { ClearSingleAppPermissions } from "#src/components/interface/permissions/ClearSingleAppPermissions"
import { ListSingleAppPermissions } from "#src/components/interface/permissions/ListSingleAppPermissions"
import {
    type AppPermissions,
    getAppPermissions,
    getAppPermissionsPure,
    permissionsMapAtom,
} from "#src/state/permissions"
import { userAtom } from "#src/state/user.ts"
import type { AppURL } from "#src/utils/appURL"

export const Route = createLazyFileRoute("/embed/permissions/$appURL")({
    component: DappPermissions,
})

function useGetAppPermissions(appURL: AppURL) {
    const user = useAtomValue(userAtom)
    const permissionsMap = useAtomValue(permissionsMapAtom)
    return getAppPermissionsPure(user, appURL, permissionsMap)
}

function DappPermissions() {
    const appURL = useParams({
        from: "/embed/permissions/$appURL",
        select: (params) => decodeURI(params.appURL),
    }) as AppURL

    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const [stalePermissions, setStalePermissions] = useState(getAppPermissions(appURL))
    const reactivePermissions = useGetAppPermissions(appURL)

    useEffect(() => {
        const stale = {} as AppPermissions
        for (const key of Array.from(new Set(Object.keys(stale).concat(Object.keys(reactivePermissions))))) {
            // If the reactive permissions have changed, update the stale permissions.
            if (!stale[key] && reactivePermissions[key]) {
                console.log("adding key", key)
                stale[key] = {
                    ...reactivePermissions[key],
                    caveats: [...(reactivePermissions[key]?.caveats ?? [])],
                }
            }

            if (reactivePermissions[key]?.caveats.length > stale[key]?.caveats.length) {
                stale[key].caveats = [
                    ...(stale[key]?.caveats ?? [])
                        .concat(reactivePermissions[key]?.caveats ?? [])
                        .filter(
                            (a, index, self) =>
                                self.findIndex((b) => b.type === a.type && b.value === a.value) === index,
                        ),
                ]
            }
        }

        setStalePermissions(stale)
    }, [reactivePermissions])

    // TODO Create a usePermissionsHook, use it here to non-destructively extend the initial app permissions.
    //      This would enable showing new permissions if the user is on the permissions screen, minimizes the wallet,
    //      and then adds new permissions. Not a huge priority, granting permissions is rare.

    return (
        <div className="pb-14 overflow-x-hidden">
            <div className="animate-appear">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListSingleAppPermissions appURL={appURL} items={stalePermissions} />
                {Object.keys(stalePermissions).length > 0 && <ClearSingleAppPermissions url={appURL} />}
            </div>
        </div>
    )
}
