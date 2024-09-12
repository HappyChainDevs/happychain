import { setPermission } from "../../../services/permissions"
import { getUser } from "../../../state/user"
import type { MiddlewareFunction } from "../../types"

export const ethRequestAccountsMiddleware: MiddlewareFunction = async (request, next) => {
    if ("eth_requestAccounts" !== request.payload.method) {
        return await next()
    }
    const user = getUser()

    if (!user) {
        return []
    }

    setPermission(request.payload)

    return user.addresses ?? [user.address]
}