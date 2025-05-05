import { validator as zValidator } from "hono-openapi/zod"
import {
    UserCreateRequestSchema,
    UserIdParamSchema,
    UserQuerySchema,
    UserUpdateRequestSchema,
    UserWalletAddRequestSchema,
    WalletAddressParamSchema,
} from "./userSchemas"

export const UserQueryValidation = zValidator("query", UserQuerySchema)

export const UserCreateValidation = zValidator("json", UserCreateRequestSchema)

export const UserUpdateValidation = zValidator("json", UserUpdateRequestSchema)

export const UserWalletAddValidation = zValidator("json", UserWalletAddRequestSchema)

export const UserIdParamValidation = zValidator("param", UserIdParamSchema)

export const WalletAddressParamValidation = zValidator("param", WalletAddressParamSchema)
