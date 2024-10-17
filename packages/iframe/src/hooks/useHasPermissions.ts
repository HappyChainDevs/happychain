import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { type PermissionsRequest, atomForPermissionsCheck } from "../state/permissions"

export function useHasPermissions(permissionsRequest: PermissionsRequest, appUrl?: string) {
    // This must be memoized to avoid an infinite render loop.
    const permissionsAtom = useMemo(
        () => atomForPermissionsCheck(permissionsRequest, appUrl), //
        [permissionsRequest, appUrl],
    )
    return useAtomValue(permissionsAtom)
}
