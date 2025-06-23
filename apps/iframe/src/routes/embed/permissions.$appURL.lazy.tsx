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

    const user = useAtomValue(userAtom)
    const permissionsMap = useAtomValue(permissionsMapAtom)
    const reactivePermissions = getAppPermissionsPure(user, appURL, permissionsMap)

    let updated = false

    // Loop through the keys, checking for new keys and updates to existing keys.
    // The keys here are permission names, as listed in `src/constants/permissions.ts`.
    for (const key of Object.keys({ ...cachedPermissions, ...reactivePermissions })) {
        // Fingerprint the caveats to check for changes.
        const cacheKey = canonicalCaveatKey(cachedPermissions[key]?.caveats)
        const reactiveKey = canonicalCaveatKey(reactivePermissions[key]?.caveats)

        if (reactiveKey === cacheKey) continue

        const isNewPermissionName = cachedPermissions[key] === undefined
        if (isNewPermissionName) {
            cachedPermissions[key] = structuredClone(reactivePermissions[key])
            updated = true
        } else {
            cachedPermissions[key].caveats = mergeCaveats(
                cachedPermissions[key]?.caveats,
                reactivePermissions[key]?.caveats,
            )
            // Check if merging actually changed the permissions.
            const updatedCacheKey = canonicalCaveatKey(cachedPermissions[key].caveats)
            if (updatedCacheKey !== cacheKey) updated = true
        }
    }

    if (updated) setCachedPermissions(() => cachedPermissions)
    return { permissions: cachedPermissions }
}

function canonicalCaveatKey(caveats?: WalletPermissionCaveat[]) {
    if (!caveats?.length) return ""
    return caveats
        .map((c) => `${c.type}::${c.value}`)
        .toSorted()
        .join(",")
}

function mergeCaveats(caveatsA: WalletPermissionCaveat[] | undefined, caveatsB: WalletPermissionCaveat[] | undefined) {
    if (!caveatsA) return caveatsB ?? []
    if (!caveatsB) return caveatsA
    return caveatsA.concat(caveatsB).filter(filterUnique)
}

function filterUnique(a: WalletPermissionCaveat, index: number, array: WalletPermissionCaveat[]) {
    return array.findIndex((b) => b.type === a.type && b.value === a.value) === index
}
