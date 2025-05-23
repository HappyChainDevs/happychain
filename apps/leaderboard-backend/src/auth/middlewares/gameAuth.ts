import type { Context } from "hono"
import type { GameTableId } from "../../db/types"
import { GameRole, ResourceType } from "../roles"
import type { ActionType, RoleType } from "../roles"
import { requirePermission } from "./permissions"

/**
 * Get the user's role in a game based on their relationship to the game
 * Returns GameRole.CREATOR or GameRole.PLAYER
 */
async function getGameUserRole(c: Context): Promise<RoleType | undefined> {
    const userId = c.get("userId")
    const game_id = c.req.param("id")
    if (!userId || !game_id) return undefined

    const { gameRepo } = c.get("repos")
    const gameId = Number.parseInt(game_id, 10) as GameTableId

    // Check if game exists
    const game = await gameRepo.findById(gameId)
    if (!game) return undefined

    // Check if user is the creator
    if (game.admin_id === userId) {
        c.set("gameRole", GameRole.CREATOR)
        return GameRole.CREATOR
    }

    // For games, all authenticated users are considered players
    return GameRole.PLAYER
}

/**
 * Middleware factory for game operations that combines permission checking
 * @param action The action being performed on the game
 * @returns A middleware that checks if the user has permission to perform the action
 */
export const gameAction = (action: ActionType) => {
    return requirePermission({
        resource: ResourceType.GAME,
        action,
        getUserRole: getGameUserRole,
    })
}
