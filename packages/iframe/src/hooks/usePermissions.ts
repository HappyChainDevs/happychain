import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import {
    type GetPermissionActionParams,
    getPermissionAction,
    hasPermissionAction,
    revokePermissionAction,
} from "../services/permissions/actions"
import { getPermissionsForDapp } from "../services/permissions/utils"
import { type WalletPermissionRequest, permissionsAtom } from "../state/permissions"
import { userAtom } from "../state/user"
import { getDappOrigin } from "../utils/getDappOrigin"

const dappOrigin = getDappOrigin()

function useDappPermissions() {
    const permissions = useAtomValue(permissionsAtom)
    const user = useAtomValue(userAtom)
    return useMemo(() => {
        return getPermissionsForDapp(dappOrigin, user, permissions)
    }, [user, permissions])
}

export function useHasPermission() {
    const dappPermissions = useDappPermissions()
    return useCallback(
        (...permissions: WalletPermissionRequest[]) => hasPermissionAction(permissions, dappPermissions),
        [dappPermissions],
    )
}

export function useGetPermissions() {
    const dappPermissions = useDappPermissions()
    return useCallback(
        ({ method, params }: GetPermissionActionParams = { method: "wallet_getPermissions" }) => {
            return getPermissionAction({ method, params } as GetPermissionActionParams, dappPermissions)
        },
        [dappPermissions],
    )
}

export function useRevokePermission() {
    const dappPermissions = useDappPermissions()
    return useCallback(
        (...params: { [key: string]: unknown }[]) => revokePermissionAction(params, dappPermissions),
        [dappPermissions],
    )
}
