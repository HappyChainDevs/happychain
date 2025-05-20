import { describeRoute } from "hono-openapi"
import { ErrorResponseSchemaObj } from "../common/responseSchemas"
import { AuthChallengeResponseSchemaObj, AuthResponseSchemaObj, SessionListResponseSchemaObj } from "./authSchemas"

// ====================================================================================================
// Authentication Routes

export const AuthChallengeDescription = describeRoute({
    validateResponse: false,
    description: "Request a challenge message to sign with a wallet.",
    requestBody: {
        description: "Authentication challenge request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Challenge message generated successfully.",
            content: {
                "application/json": {
                    schema: AuthChallengeResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid request data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const AuthVerifyDescription = describeRoute({
    validateResponse: false,
    description: "Verify a signature and create a new session.",
    requestBody: {
        description: "Authentication verification request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Signature verified and session created successfully.",
            content: {
                "application/json": {
                    schema: AuthResponseSchemaObj,
                },
            },
        },
        401: {
            description: "Invalid signature.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid request data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const AuthMeDescription = describeRoute({
    validateResponse: false,
    description: "Get current user information from session.",
    responses: {
        200: {
            description: "User information retrieved successfully.",
            content: {
                "application/json": {
                    schema: AuthResponseSchemaObj,
                },
            },
        },
        401: {
            description: "Not authenticated or invalid session.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const AuthLogoutDescription = describeRoute({
    validateResponse: false,
    description: "Logout and invalidate the current session.",
    requestBody: {
        description: "Session ID to invalidate.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Session invalidated successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ok: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid session ID.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const AuthSessionsDescription = describeRoute({
    validateResponse: false,
    description: "List all active sessions for the current user.",
    responses: {
        200: {
            description: "Sessions retrieved successfully.",
            content: {
                "application/json": {
                    schema: SessionListResponseSchemaObj,
                },
            },
        },
        401: {
            description: "Not authenticated or invalid session.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})
