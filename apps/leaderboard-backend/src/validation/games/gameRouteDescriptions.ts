import { describeRoute } from "hono-openapi"
import {
    ErrorResponseSchemaObj,
    GameListResponseSchemaObj,
    GameResponseSchemaObj,
    UserGameScoreResponseSchemaObj,
} from "./gameSchemas"

// ====================================================================================================
// Game Collection

export const GameQueryDescription = describeRoute({
    validateResponse: false,
    description: "Get a list of games, optionally filtered by name or admin.",
    responses: {
        200: {
            description: "Successfully retrieved games.",
            content: {
                "application/json": {
                    schema: GameListResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid query parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const GameCreateDescription = describeRoute({
    validateResponse: false,
    description: "Create a new game (admin required).",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Game created successfully.",
            content: {
                "application/json": {
                    schema: GameResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid request body.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        409: {
            description: "Game name already exists.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// Individual Game

export const GameGetByIdDescription = describeRoute({
    validateResponse: false,
    description: "Get a game by its ID.",
    responses: {
        200: {
            description: "Successfully retrieved game.",
            content: {
                "application/json": {
                    schema: GameResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Game not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const GameUpdateDescription = describeRoute({
    validateResponse: false,
    description: "Update details of a game (admin only).",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Game updated successfully.",
            content: {
                "application/json": {
                    schema: GameResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Game not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        409: {
            description: "Game name already exists.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid request body or parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// Game Listing by Admin

export const GameListByAdminDescription = describeRoute({
    validateResponse: false,
    description: "List all games for a given admin wallet.",
    responses: {
        200: {
            description: "Successfully retrieved games for admin.",
            content: {
                "application/json": {
                    schema: GameListResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Admin user not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid admin wallet parameter.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// Game Scores

export const ScoreSubmitDescription = describeRoute({
    validateResponse: false,
    description: "Submit a new score for a game.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Score submitted successfully.",
            content: {
                "application/json": {
                    schema: UserGameScoreResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Game or user not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid request body or parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        409: {
            description: "Duplicate score or conflict.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const GameScoresListDescription = describeRoute({
    validateResponse: false,
    description: "Get all scores for a game.",
    responses: {
        200: {
            description: "Successfully retrieved scores.",
            content: {
                "application/json": {
                    schema: GameListResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Game not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserGameScoresListDescription = describeRoute({
    validateResponse: false,
    description: "Get all scores for a user in a game.",
    responses: {
        200: {
            description: "Successfully retrieved user's scores for the game.",
            content: {
                "application/json": {
                    schema: GameListResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Game or user not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid parameters.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})
