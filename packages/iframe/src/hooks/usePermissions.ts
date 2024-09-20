import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { type PermissionRequest, getDappPermissions, hasPermissions } from "../services/permissions"
import { permissionsAtom } from "../state/permissions"
import { userAtom } from "../state/user"

function useDappPermissions() {
    const permissions = useAtomValue(permissionsAtom)
    const user = useAtomValue(userAtom)
    return useMemo(() => {
        return getDappPermissions(user, permissions)
    }, [user, permissions])
}

export function useHasPermission() {
    const dappPermissions = useDappPermissions()
    return useCallback(
        (...permissions: PermissionRequest[]) => hasPermissions(permissions, dappPermissions),
        [dappPermissions],
    )
}
