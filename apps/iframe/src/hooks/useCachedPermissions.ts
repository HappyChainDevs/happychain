import { useAtomValue } from "jotai"
import { useState } from "react"
import { getAppPermissions, getAppPermissionsPure } from "#src/state/permissions"
import { permissionsMapLegend } from "#src/state/permissions/observable"
import type { AppPermissions } from "#src/state/permissions/types"
import { userAtom } from "#src/state/user"
import type { AppURL } from "#src/utils/appURL"
import { canonicalCaveatKey, mergeCaveats } from "#src/utils/caveats"

export function useCachedPermissions(appURL: AppURL): { permissions: AppPermissions } {
    // Very purposefully not reactive: when revoking a permission, it will show as toggled off instead of vanishing,
    // and can be toggle back on while we don't navigate away.
    const [cachedPermissions, setCachedPermissions] = useState(structuredClone(getAppPermissions(appURL)))
    const user = useAtomValue(userAtom)
    const permissionsMap = permissionsMapLegend.get()
    const reactivePermissions = getAppPermissionsPure(user, appURL, Object.values(permissionsMap))

    /**
     * flag to track if any update has occurred. If se, we will set state
     */
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
