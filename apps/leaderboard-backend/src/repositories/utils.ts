import type { GameTableId, GuildTableId, UserTableId } from "../db/types"
import type { GameRepository } from "./GamesRepository"
import type { GuildRepository } from "./GuildsRepository"

export async function isUserGameAdminById(
    gameRepo: GameRepository,
    userId: UserTableId,
    gameId: GameTableId,
): Promise<boolean> {
    const game = await gameRepo.findById(gameId)
    return game ? game.admin_id === userId : false
}

export async function isUserGuildAdminById(
    guildRepo: GuildRepository,
    userId: UserTableId,
    guildId: GuildTableId,
): Promise<boolean> {
    const member = await guildRepo.findGuildMember(guildId, userId)
    return !!member && member.is_admin === true
}
