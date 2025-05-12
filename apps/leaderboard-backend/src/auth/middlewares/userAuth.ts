import { createMiddleware } from "hono/factory"
import type { UserTableId } from "../../db/types"

export const requireOwnership = (paramName: string, idType: "id" | "primary_wallet") => {
    return createMiddleware(async (c, next) => {
        const userId = c.get("userId") as UserTableId
        const resourceId = c.req.param(paramName)

        if (idType === "id" && userId !== (Number(resourceId) as UserTableId)) {
            return c.json({ error: "You can only access your own resources", ok: false }, 403)
        }

        if (idType === "primary_wallet" && c.get("primaryWallet") !== resourceId) {
            return c.json({ error: "You can only access your own resources", ok: false }, 403)
        }

        await next()
    })
}
