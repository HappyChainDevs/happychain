import type { Context } from "hono"
import type { UserTableId } from "../../db/types"
import { ActionType, ResourceType, UserRole } from "../roles"
import type { RoleType } from "../roles"
import { requirePermission } from "./permissions"

/**
 * Get the user's role in relation to the request context
 * For actions that require SELF permission (UPDATE, DELETE, MANAGE),
 * we check if the authenticated user is accessing their own resources.
 *
 * @param c - The context from the request
 * @param action - The action being performed (optional)
 * @returns The role of the user (SELF or AUTHENTICATED)
 */
async function getUserRole(c: Context, action?: ActionType): Promise<RoleType | undefined> {
    const authenticatedUserId = c.get("userId")
    if (!authenticatedUserId) return undefined

    // Get target identifiers from route params
    const targetIdParam = c.req.param("id")
    const targetWalletParam = c.req.param("primary_wallet")

    // For sensitive operations (UPDATE, DELETE, MANAGE) we need to verify identity
    const requiresSelfCheck =
        action === ActionType.UPDATE || action === ActionType.DELETE || action === ActionType.MANAGE

    // If we're checking a route that operates on a specific user
    if (requiresSelfCheck) {
        // Check if accessing by user ID
        if (targetIdParam) {
            const targetUserId = Number.parseInt(targetIdParam, 10) as UserTableId
            if (authenticatedUserId === targetUserId) {
                c.set("userRole", UserRole.SELF)
                return UserRole.SELF
            }
        }

        // Check if accessing by primary wallet
        if (targetWalletParam) {
            const authenticatedWallet = c.get("primaryWallet")
            if (authenticatedWallet === targetWalletParam) {
                c.set("userRole", UserRole.SELF)
                return UserRole.SELF
            }
        }
    }

    // Otherwise the user is just an authenticated user accessing someone else's resources
    return UserRole.AUTHENTICATED
}

/**
 * Middleware factory for user operations that combines permission checking
 * @param action The action being performed on the user resource
 * @returns A middleware that checks if the user has permission to perform the action
 */
export const userAction = (action: ActionType) => {
    return requirePermission({
        resource: ResourceType.USER,
        action,
        getUserRole: (c) => getUserRole(c, action),
    })
}
