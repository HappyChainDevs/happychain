import { describeRoute } from "hono-openapi"
import { ErrorResponseSchemaObj, GuildListResponseSchemaObj, GuildResponseSchemaObj } from "./guildSchemas"

// ====================================================================================================
// Guild Collection

export const GuildQueryDescription = describeRoute({
    validateResponse: false,
    description: "Get a list of guilds, optionally filtered by name or creator_id.",
    responses: {
        200: {
            description: "Successfully retrieved guilds.",
            content: {
                "application/json": {
                    schema: GuildListResponseSchemaObj,
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

export const GuildCreateDescription = describeRoute({
    validateResponse: false,
    description: "Create a new guild.",
    requestBody: {
        description: "Guild creation request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Guild created successfully.",
            content: {
                "application/json": {
                    schema: GuildResponseSchemaObj,
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
    },
})
