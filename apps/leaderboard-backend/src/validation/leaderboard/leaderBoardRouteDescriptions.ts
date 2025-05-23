import { describeRoute } from "hono-openapi"
import { ErrorResponseSchemaObj } from "../common"
import {
    GameGuildLeaderBoardResponseObj,
    GameLeaderBoardResponseObj,
    GlobalLeaderBoardResponseObj,
    GuildLeaderBoardResponseObj,
} from "./leaderBoardRouteValidations"

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
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
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
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
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
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
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
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})
