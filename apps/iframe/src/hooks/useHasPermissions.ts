import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { type PermissionsRequest, atomForPermissionsCheck } from "../state/permissions"
import { type AppURL, getAppURL } from "../utils/appURL"

export function useHasPermissions(permissionsRequest: PermissionsRequest, app: AppURL = getAppURL()) {
    // This must be memoized to avoid an infinite render loop.
    const permissionsAtom = useMemo(
        () => atomForPermissionsCheck(permissionsRequest, app), //
        [permissionsRequest, app],
    )
    return useAtomValue(permissionsAtom)
}
