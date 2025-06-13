import { createLazyFileRoute, useParams } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useState } from "react"
import type { WalletPermissionCaveat } from "viem"
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

    const { permissions } = useCachedPermissions(appURL)

    return (
        <div className="pb-14 overflow-x-hidden">
            <div className="animate-appear">
                <h2 className="sticky top-0 text-center bg-base-200 text-base-content font-bold p-1 text-sm">
                    {appURL}
                </h2>
                <p className="sr-only">Access and change the permissions of all dApps you interacted with.</p>
                <ListSingleAppPermissions appURL={appURL} items={permissions} />
                {Object.keys(permissions).length > 0 && <ClearSingleAppPermissions url={appURL} />}
            </div>
        </div>
    )
}

function useCachedPermissions(appURL: AppURL): { permissions: AppPermissions } {
    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const [cachedPermissions, setCachedPermissions] = useState(structuredClone(getAppPermissions(appURL)))

    const reactivePermissions = useGetAppPermissions(appURL)

    let updated = false

    // de-duplicate and loop through the keys. the keys here are the capabilities, eth_accounts, happy_sessionKey, etc
    for (const key of Object.keys({ ...cachedPermissions, ...reactivePermissions })) {
        // If this is a new key, we were not previously await of. update the local view
        // and mark it as updated.

        // precompute the caveat 'keys' to avoid updates when nothing has changed.

        const reactiveKey = canonicalCaveatKey(reactivePermissions[key]?.caveats)
        const staleKey = canonicalCaveatKey(cachedPermissions[key]?.caveats)

        // there where no changes to this key, skip it.
        if (reactiveKey === staleKey) continue

        // if the key is not in the stale permissions, we will add it.
        // if it is, we will update the caveats.
        // we use `??=` to only set it if it is undefined, otherwise we will overwrite the existing value.
        const alreadyKnown = cachedPermissions[key] !== undefined

        // add if its a new key
        cachedPermissions[key] ??= structuredClone(reactivePermissions[key])

        // update if it was known previously
        if (alreadyKnown) {
            cachedPermissions[key].caveats = mergeCaveats(
                cachedPermissions[key]?.caveats,
                reactivePermissions[key]?.caveats,
            )
        }

        // we will re-compute the 'stale' key to see if it has actually changed.
        const updatedStaleKey = canonicalCaveatKey(cachedPermissions[key].caveats)
        if (updatedStaleKey !== staleKey) updated = true
    }

    // if changes where detected, we will update the state.
    if (updated) setCachedPermissions(() => cachedPermissions)

    return { permissions: cachedPermissions }
}

function filterUnique(a: WalletPermissionCaveat, index: number, array: WalletPermissionCaveat[]) {
    return array.findIndex((b) => b.type === a.type && b.value === a.value) === index
}
function mergeCaveats(caveatsA: WalletPermissionCaveat[] | undefined, caveatsB: WalletPermissionCaveat[] | undefined) {
    if (!caveatsA) return caveatsB ?? []
    if (!caveatsB) return caveatsA
    return caveatsA.concat(caveatsB).filter(filterUnique)
}
function canonicalCaveatKey(caveats?: WalletPermissionCaveat[]) {
    if (!caveats?.length) return ""
    return caveats
        .map((c) => `${c.type}::${c.value}`)
        .toSorted()
        .join(",")
}
