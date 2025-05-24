import { describeRoute } from "hono-openapi"
import {
    GameGuildLeaderBoardResponseObj,
    GameLeaderBoardResponseObj,
    GlobalLeaderBoardResponseObj,
    GuildLeaderBoardResponseObj,
} from "./leaderBoardSchema"

export const GlobalLeaderboardDescription = describeRoute({
    validateResponse: false,
    description: "Returns users ranked by their total score across all games.",
    responses: {
        200: {
            description: "Global leaderboard data",
            content: {
                "application/json": {
                    schema: GlobalLeaderBoardResponseObj,
                },
            },
        },
    },
})

export const GuildLeaderboardDescription = describeRoute({
    validateResponse: false,
    description: "Returns guilds ranked by their members' total score across all games.",
    responses: {
        200: {
            description: "Guild leaderboard data",
            content: {
                "application/json": {
                    schema: GuildLeaderBoardResponseObj,
                },
            },
        },
    },
})

export const GameLeaderboardDescription = describeRoute({
    validateResponse: false,
    description: "Returns users ranked by their score in a specific game.",
    responses: {
        200: {
            description: "Game leaderboard data",
            content: {
                "application/json": {
                    schema: GameLeaderBoardResponseObj,
                },
            },
        },
    },
})

export const GameGuildLeaderboardDescription = describeRoute({
    validateResponse: false,
    description: "Returns guilds ranked by their members' total score in a specific game.",
    responses: {
        200: {
            description: "Game-specific guild leaderboard data",
            content: {
                "application/json": {
                    schema: GameGuildLeaderBoardResponseObj,
                },
            },
        },
    },
})
