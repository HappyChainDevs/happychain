import { describeRoute } from "hono-openapi"
import { ErrorResponseSchemaObj } from "../common"
import { GuildListResponseSchemaObj, GuildResponseSchemaObj } from "./guildRouteValidations"

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

export const GuildGetByIdDescription = describeRoute({
    validateResponse: false,
    description: "Get a guild by its ID (optionally include members).",
    responses: {
        200: {
            description: "Successfully retrieved guild.",
            content: {
                "application/json": {
                    schema: GuildResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Guild not found.",
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

export const GuildUpdateDescription = describeRoute({
    validateResponse: false,
    description: "Update details of a guild (admin only).",
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
            description: "Guild updated successfully.",
            content: {
                "application/json": {
                    schema: GuildResponseSchemaObj,
                },
            },
        },
        404: {
            description: "Guild not found.",
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

export const GuildListMembersDescription = describeRoute({
    validateResponse: false,
    description: "List all members of a guild.",
    responses: {
        200: {
            description: "Successfully retrieved guild members.",
            content: {
                "application/json": {
                    schema: {},
                },
            },
        },
        404: {
            description: "Guild not found.",
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

export const GuildMemberAddDescription = describeRoute({
    validateResponse: false,
    description: "Add a member to a guild (admin only).",
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
            description: "Member added successfully.",
            content: {
                "application/json": {
                    schema: {},
                },
            },
        },
        404: {
            description: "Guild or user not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        409: {
            description: "User is already a member of the guild.",
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

export const GuildMemberUpdateDescription = describeRoute({
    validateResponse: false,
    description: "Update a guild member's role (admin only).",
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
            description: "Member updated successfully.",
            content: {
                "application/json": {
                    schema: {},
                },
            },
        },
        404: {
            description: "Guild or member not found.",
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

export const GuildMemberDeleteDescription = describeRoute({
    validateResponse: false,
    description: "Remove a member from a guild (admin only).",
    responses: {
        200: {
            description: "Member removed successfully.",
            content: {
                "application/json": {
                    schema: {},
                },
            },
        },
        404: {
            description: "Guild or member not found, or user is the creator.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid parameters or removal not allowed.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})
