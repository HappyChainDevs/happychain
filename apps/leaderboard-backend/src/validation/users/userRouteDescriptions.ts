import { describeRoute } from "hono-openapi"
import { ErrorResponseSchemaObj } from "../common/responseSchemas"
import {
    UserListResponseSchemaObj,
    UserResponseSchemaObj,
    UserWalletListResponseSchemaObj,
} from "./userRouteValidations"

// ====================================================================================================
// User Collection

export const UserQueryDescription = describeRoute({
    validateResponse: false,
    description: "Get a list of users, optionally filtered by primary_wallet or username.",
    responses: {
        200: {
            description: "Successfully retrieved users.",
            content: {
                "application/json": {
                    schema: UserListResponseSchemaObj,
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

export const UserCreateDescription = describeRoute({
    validateResponse: false,
    description: "Create a new user.",
    requestBody: {
        description: "User creation request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "User created successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid user creation data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// User Resource by ID

export const UserGetByIdDescription = describeRoute({
    validateResponse: false,
    description: "Get user details by user ID.",
    responses: {
        200: {
            description: "User found.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserUpdateByIdDescription = describeRoute({
    validateResponse: false,
    description: "Update user details by user ID.",
    requestBody: {
        description: "User update request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "User updated successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid update data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserDeleteByIdDescription = describeRoute({
    validateResponse: false,
    description: "Delete a user by user ID and all associated data.",
    responses: {
        200: {
            description: "User deleted successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// User Resource by Primary Wallet

export const UserGetByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Get user details by primary wallet address.",
    responses: {
        200: {
            description: "User found.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserUpdateByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Update user details by primary wallet address.",
    requestBody: {
        description: "User update request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "User updated successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid update data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserDeleteByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Delete a user by primary wallet address and all associated data.",
    responses: {
        200: {
            description: "User deleted successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// Wallet Collection (by User ID and Primary Wallet)

export const UserWalletsGetByIdDescription = describeRoute({
    validateResponse: false,
    description: "Get all wallets for a user by user ID.",
    responses: {
        200: {
            description: "Wallets retrieved successfully.",
            content: {
                "application/json": {
                    schema: UserWalletListResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletsGetByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Get all wallets for a user by primary wallet address.",
    responses: {
        200: {
            description: "Wallets retrieved successfully.",
            content: {
                "application/json": {
                    schema: UserWalletListResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletAddByIdDescription = describeRoute({
    validateResponse: false,
    description: "Add a wallet to a user by user ID.",
    requestBody: {
        description: "Wallet add request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Wallet added successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletAddByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Add a wallet to a user by primary wallet address.",
    requestBody: {
        description: "Wallet add request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Wallet added successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

// ====================================================================================================
// Wallet Resource (Set Primary, Remove)

export const UserWalletSetPrimaryByIdDescription = describeRoute({
    validateResponse: false,
    description: "Set a wallet as primary for a user by user ID.",
    requestBody: {
        description: "Set primary wallet request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Primary wallet set successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User or wallet not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletSetPrimaryByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Set a wallet as primary for a user by primary wallet address.",
    requestBody: {
        description: "Set primary wallet request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Primary wallet set successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User or wallet not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletRemoveByIdDescription = describeRoute({
    validateResponse: false,
    description: "Remove a wallet from a user by user ID.",
    requestBody: {
        description: "Remove wallet request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Wallet removed successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User or wallet not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletRemoveByPrimaryWalletDescription = describeRoute({
    validateResponse: false,
    description: "Remove a wallet from a user by primary wallet address.",
    requestBody: {
        description: "Remove wallet request body.",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "Wallet removed successfully.",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid wallet data.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        404: {
            description: "User or wallet not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})

export const UserGuildsListDescription = describeRoute({
    validateResponse: false,
    description: "Get all guilds a user belongs to.",
    responses: {
        200: {
            description: "Successfully retrieved user guilds.",
            content: {
                "application/json": {
                    schema: {},
                },
            },
        },
        404: {
            description: "User not found.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
        400: {
            description: "Invalid user ID parameter.",
            content: {
                "application/json": {
                    schema: ErrorResponseSchemaObj,
                },
            },
        },
    },
})
