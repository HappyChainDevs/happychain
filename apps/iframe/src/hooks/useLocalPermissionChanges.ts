import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { createContext, use, useState } from "react"
import type { WalletPermissionCaveat } from "viem"
import { PermissionName } from "#src/constants/permissions"
import { revokeSessionKeys } from "#src/requests/utils/sessionKeys"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { grantPermissions, hasPermissions, permissionRequestEntries, revokePermissions } from "#src/state/permissions"
import type { PermissionsRequest } from "#src/state/permissions/types"
import type { AppURL } from "#src/utils/appURL"
import { mergeCaveats } from "#src/utils/caveats"
import { checkIfCaveatsMatch } from "#src/utils/checkIfCaveatsMatch"

export const PermissionsContext = createContext<null | ReturnType<typeof createLocalPermissionsValue>>(null)

export function createLocalPermissionsValue(appURL: AppURL) {
    // Keep a set of permissions to be revoked on save.
    const [revoked, setRevoked] = useState<{ [name: string]: WalletPermissionCaveat[] }>({})
    const router = useRouter()

    // Granting a permission in this context is undoing a revocation.
    const grant = (permissionRequest: PermissionsRequest) => {
        const entries = permissionRequestEntries(permissionRequest)
        setRevoked((prevRevoked) => {
            for (const { name, caveats } of entries) {
                // its not revoked, we just skip it now
                if (!prevRevoked[name]) continue
                prevRevoked[name] = prevRevoked[name].filter((a) => !caveats.some((c) => checkIfCaveatsMatch(a, c)))
                if (!prevRevoked[name].length) delete prevRevoked[name]
            }
            return { ...prevRevoked }
        })
    }

    const revoke = (permissionRequest: PermissionsRequest) => {
        const entries = permissionRequestEntries(permissionRequest)
        setRevoked((prevRevoked) => {
            for (const { name, caveats } of entries) {
                if (!prevRevoked[name]) {
                    prevRevoked[name] = caveats
                    continue
                }

                prevRevoked[name] = mergeCaveats(prevRevoked[name], caveats)
            }

            return { ...prevRevoked }
        })
    }

    const has = (permissionRequest: PermissionsRequest) => {
        // we can not add new permissions from this page,
        // so if the permission is not granted, we return false
        if (!hasPermissions(appURL, permissionRequest)) return false

        return permissionRequestEntries(permissionRequest).every(({ name, caveats }) => {
            const revokedCaveats = revoked[name]
            // if there is no revoked caveats entry, then we know the user has the permission
            // (see hasPermissions call above) and it is not revoked.
            if (!revokedCaveats) return true

            // if there is an entry, but it is empty, such as with eth_accounts, then we can assume
            // the entire category is revoked, so we return false.
            if (!revokedCaveats.length) return false

            // Check to see if at least one caveat of the request has been revoked.
            return caveats.every(
                (caveat) => !revokedCaveats.some((storedPermission) => checkIfCaveatsMatch(storedPermission, caveat)),
            )
        })
    }

    const save = useMutation({
        mutationFn: async () => {
            const entries = Object.entries(revoked)
            for (const [name, caveats] of entries) {
                if (name === PermissionName.SessionKey) {
                    for (const caveat of caveats) {
                        const perm: PermissionsRequest = { [name]: { target: caveat.value } }
                        revokePermissions(appURL, perm)
                    }
                } else {
                    revokePermissions(appURL, name)
                }
            }

            await revokeSessionKeys(appURL, [...revokedSessionKeys.values()])
        },
        onSuccess: () => {
            router.history.back()
        },
        onError: (error) => {
            console.error("Error saving permissions:", error)
            // on error, we will re-grant the permissions (no change)
            const entries = Object.entries(revoked)
            for (const [name, caveats] of entries) {
                if (name === PermissionName.SessionKey) {
                    for (const caveat of caveats) {
                        const perm: PermissionsRequest = { [name]: { target: caveat.value } }
                        grantPermissions(appURL, perm)
                    }
                } else {
                    grantPermissions(appURL, name)
                }
            }
        },
    })

    return { appURL, grant, revoke, save, has }
}

export function useLocalPermissionChanges() {
    const ctx = use(PermissionsContext)
    if (!ctx) throw new Error("useLocalPermissionChanges must be used within <PermissionsContext>")
    return ctx
}
