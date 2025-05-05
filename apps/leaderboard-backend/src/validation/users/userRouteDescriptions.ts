import { describeRoute } from "hono-openapi"
import { UserResponseSchemaObj } from "./userSchemas"

export const UserQueryDescription = describeRoute({
    validateResponse: true,
    description: "Get a list of users",
    responses: {
        200: {
            description: "Successfully retrieved users",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
    },
})

export const UserCreateDescription = describeRoute({
    validateResponse: true,
    description: "Create a new user",
    requestBody: {
        description: "User creation request",
        required: true,
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        201: {
            description: "Successfully created a user",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
    },
})

export const UserUpdateDescription = describeRoute({
    validateResponse: true,
    description: "Update a user's details",
    responses: {
        200: {
            description: "Successfully updated a user",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
    },
})

export const UserWalletAddDescription = describeRoute({
    validateResponse: true,
    description: "Add a wallet to a user",
    responses: {
        201: {
            description: "Successfully added a wallet to a user",
            content: {
                "application/json": {
                    schema: UserResponseSchemaObj,
                },
            },
        },
    },
})
