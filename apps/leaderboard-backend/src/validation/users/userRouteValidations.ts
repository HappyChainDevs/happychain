import { validator as zValidator } from "hono-openapi/zod"
import {
    PrimaryWalletParamSchema,
    UserCreateRequestSchema,
    UserIdParamSchema,
    UserQuerySchema,
    UserUpdateRequestSchema,
    UserWalletRequestSchema,
} from "./userSchemas"

export const UserQueryValidation = zValidator("query", UserQuerySchema)

export const UserCreateValidation = zValidator("json", UserCreateRequestSchema)

export const UserUpdateValidation = zValidator("json", UserUpdateRequestSchema)

export const UserWalletValidation = zValidator("json", UserWalletRequestSchema)

export const UserIdParamValidation = zValidator("param", UserIdParamSchema)

export const PrimaryWalletParamValidation = zValidator("param", PrimaryWalletParamSchema)
