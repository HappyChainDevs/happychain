import { resolver, validator as zValidator } from "hono-openapi/zod"
import { createSuccessResponseSchema } from "../common"
import {
    GameGuildLeaderboardEntrySchema,
    GameLeaderboardEntrySchema,
    GlobalLeaderboardEntrySchema,
    GuildLeaderboardEntrySchema,
    LeaderboardGameIdParamSchema,
    LeaderboardLimitQuerySchema,
} from "./leaderBoardSchema"

export const GlobalLeaderBoardResponseObj = resolver(createSuccessResponseSchema(GlobalLeaderboardEntrySchema))
export const GuildLeaderBoardResponseObj = resolver(createSuccessResponseSchema(GuildLeaderboardEntrySchema))
export const GameLeaderBoardResponseObj = resolver(createSuccessResponseSchema(GameLeaderboardEntrySchema))
export const GameGuildLeaderBoardResponseObj = resolver(createSuccessResponseSchema(GameGuildLeaderboardEntrySchema))

export const GlobalLeaderboardValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GuildLeaderboardValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GameLeaderboardParamValidation = zValidator("param", LeaderboardGameIdParamSchema)
export const GameLeaderboardQueryValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GameGuildLeaderboardParamValidation = zValidator("param", LeaderboardGameIdParamSchema)
export const GameGuildLeaderboardQueryValidation = zValidator("query", LeaderboardLimitQuerySchema)
