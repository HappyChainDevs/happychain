import type { Context, MiddlewareHandler } from "hono"
import { createMiddleware } from "hono/factory"
import { type ActionType, Permissions, type ResourceType, type RoleType, UserRole } from "../roles"

/**
 * Generic permissions middleware for resource-based RBAC.
 *
 * Usage:
 *   permissions({ resource: "guild", action: "add_member" })
 *
 * Looks up the user's role for the resource and checks if it's allowed for the action.
 *
 * @param opts.resource: ResourceType - The resource type (e.g., "guild")
 * @param opts.action - The action type (e.g., "add_member")
 * @param opts.getUserRole - Optional: custom function to get the user's role for the resource
 */
export function requirePermission({
    resource,
    action,
    getUserRole,
}: {
    resource: ResourceType
    action: ActionType
    getUserRole?: (c: Context) => Promise<RoleType | undefined>
}): MiddlewareHandler {
    return createMiddleware(async (c, next) => {
        // Determine the user's role for this resource
        let role: RoleType | undefined
        if (getUserRole) {
            role = await getUserRole(c)
        } else {
            // Default: look for c.get("guildRole"), c.get("gameRole"), etc.
            role = c.get("role") || c.get("guildRole") || c.get("gameRole") || c.get("userRole")
            // If nothing found, fallback to UserRole.AUTHENTICATED
            if (!role) role = UserRole.AUTHENTICATED
        }

        // Find allowed roles from the Permissions object
        const allowed = Permissions?.[resource]?.[action]
        if (!allowed) {
            return c.json({ ok: false, error: `Permission config not found for ${resource}.${action}` }, 500)
        }

        // Allow if user's role is in allowed list
        if (role && allowed.includes(role)) {
            await next()
            return
        }

        return c.json({ ok: false, error: "Forbidden: insufficient role/permissions" }, 403)
    })
}
