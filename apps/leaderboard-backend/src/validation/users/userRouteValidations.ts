import { resolver, validator as zValidator } from "hono-openapi/zod"
import { createSuccessResponseSchema } from "../common"
import {
    PrimaryWalletParamSchema,
    UserCreateRequestSchema,
    UserIdParamSchema,
    UserQuerySchema,
    UserResponseSchema,
    UserUpdateRequestSchema,
    UserWalletListSchema,
    UserWalletRequestSchema,
} from "./userSchemas"

export const UserResponseSchemaObj = resolver(createSuccessResponseSchema(UserResponseSchema))
export const UserListResponseSchemaObj = resolver(createSuccessResponseSchema(UserResponseSchema))
export const UserWalletListResponseSchemaObj = resolver(createSuccessResponseSchema(UserWalletListSchema))

export const UserQueryValidation = zValidator("query", UserQuerySchema)
export const UserCreateValidation = zValidator("json", UserCreateRequestSchema)
export const UserUpdateValidation = zValidator("json", UserUpdateRequestSchema)
export const UserWalletValidation = zValidator("json", UserWalletRequestSchema)
export const UserIdParamValidation = zValidator("param", UserIdParamSchema)
export const PrimaryWalletParamValidation = zValidator("param", PrimaryWalletParamSchema)
