import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { createContext, use, useState } from "react"
import type { WalletPermissionCaveat } from "viem"
import { revokeSessionKeys } from "#src/requests/utils/sessionKeys"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { grantPermissions, hasPermissions, permissionRequestEntries, revokePermissions } from "#src/state/permissions"
import type { PermissionsRequest } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"
import { mergeCaveats } from "#src/utils/caveats"
import { checkIfCaveatsMatch } from "#src/utils/checkIfCaveatsMatch"

export const PermissionsContext = createContext<null | ReturnType<typeof createLocalPermissionsValue>>(null)

export function createLocalPermissionsValue(appURL: AppURL) {
    const [revoked, setRevoked] = useState<{ [name: string]: WalletPermissionCaveat[] }>({})
    const router = useRouter()

    const grant = (permissionRequest: PermissionsRequest) => {
        const entries = permissionRequestEntries(permissionRequest)
        setRevoked((prevRevoked) => {
            for (const { name, caveats } of entries) {
                // its not revoked, we just skip it now
                if (!prevRevoked[name]) continue
                prevRevoked[name] = prevRevoked[name].filter((a) => !caveats.some((c) => checkIfCaveatsMatch(a, c)))
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

    const save = useMutation({
        mutationFn: async () => {
            const entries = Object.entries(revoked)
            for (const [name, caveats] of entries) {
                if (name === "happy_sessionKey") {
                    for (const caveat of caveats) {
                        const perm: PermissionsRequest = {
                            [name]: { target: caveat.value },
                        }
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
                if (name === "happy_sessionKey") {
                    for (const caveat of caveats) {
                        const perm: PermissionsRequest = {
                            [name]: { target: caveat.value },
                        }
                        grantPermissions(appURL, perm)
                    }
                } else {
                    grantPermissions(appURL, name)
                }
            }
        },
    })

    const has = (permissionRequest: PermissionsRequest) => {
        if (!hasPermissions(appURL, permissionRequest)) return false

        return permissionRequestEntries(permissionRequest).every(({ name, caveats }) => {
            const permission = revoked[name]
            // this is opposite of hasPermissions logic since its operating on a block list
            // instead of an allow list
            if (!permission) return true

            // Verify each requested caveat has not been 'revoked'
            return caveats.every(
                (caveat) => !permission.some((storedPermission) => checkIfCaveatsMatch(storedPermission, caveat)),
            )
        })
    }

    return { appURL, grant, revoke, save, has }
}

export function useLocalPermissionChanges() {
    const ctx = use(PermissionsContext)
    if (!ctx) throw new Error("useLocalPermissionChanges must be used within <PermissionsContext>")
    return ctx
}
