import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { getDappPermissions, hasPermissions } from "../services/permissions"
import { type WalletPermissionRequest, permissionsAtom } from "../state/permissions"
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
        (...permissions: WalletPermissionRequest[]) => hasPermissions(permissions, dappPermissions),
        [dappPermissions],
    )
}
