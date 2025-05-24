import { validator as zValidator } from "hono-openapi/zod"
import { LeaderboardGameIdParamSchema, LeaderboardLimitQuerySchema } from "./leaderBoardSchema"

export const GlobalLeaderboardValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GuildLeaderboardValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GameLeaderboardParamValidation = zValidator("param", LeaderboardGameIdParamSchema)
export const GameLeaderboardQueryValidation = zValidator("query", LeaderboardLimitQuerySchema)
export const GameGuildLeaderboardParamValidation = zValidator("param", LeaderboardGameIdParamSchema)
export const GameGuildLeaderboardQueryValidation = zValidator("query", LeaderboardLimitQuerySchema)
