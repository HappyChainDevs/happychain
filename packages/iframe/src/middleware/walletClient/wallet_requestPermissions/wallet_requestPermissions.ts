import { getPermissions, setPermission } from "../../../services/permissions"

import type { MiddlewareFunction } from "../../types"

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-2255}
 */
export const walletRequestPermissionsMiddleware: MiddlewareFunction = async (request, next) => {
    if ("wallet_requestPermissions" !== request.payload.method) {
        return await next()
    }

    setPermission(request.payload)

    return getPermissions(request.payload)
}
