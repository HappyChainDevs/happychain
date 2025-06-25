import { use$ } from "@legendapp/state/react"
import type { AppPermissions } from "#src/state/permissions/types"
import { permissionsMapLegend } from "#src/state/permissions/observable"
import { type AppURL, isWallet } from "#src/utils/appURL"

export function useAppsWithPermissions(): [AppURL, AppPermissions][] {
    const appsWithPermissions = () => {
        const permissions = permissionsMapLegend.get()
        return Object.values(permissions)
            .filter((permission) => !isWallet(permission.invoker))
            .reduce(
                (acc, permission) => {
                    const existing = acc.find(([app]) => app === permission.invoker)
                    if (existing) {
                        existing[1][permission.parentCapability] = permission
                    } else {
                        acc.push([
                            permission.invoker,
                            {
                                [permission.parentCapability]: permission,
                            },
                        ])
                    }
                    return acc
                },
                [] as [AppURL, AppPermissions][],
            )
    }

    return use$(() => appsWithPermissions())
}
