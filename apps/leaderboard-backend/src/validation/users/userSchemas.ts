import { z } from "@hono/zod-openapi"
import { isHex } from "viem"

// ====================================================================================================
// Response Schemas

const UserWalletSchema = z
    .object({
        id: z.number().int(),
        user_id: z.number().int(),
        wallet_address: z.string().refine(isHex),
        is_primary: z.boolean(),
        created_at: z.string(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            user_id: 1,
            wallet_address: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            is_primary: true,
            created_at: "2023-01-01T00:00:00.000Z",
        },
    })

export const UserWalletListSchema = z.array(UserWalletSchema)

export const UserResponseSchema = z
    .object({
        id: z.number().int(),
        primary_wallet: z.string().refine(isHex),
        username: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        wallets: UserWalletListSchema.optional(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
            created_at: "2023-01-01T00:00:00.000Z",
            updated_at: "2023-01-01T00:00:00.000Z",
            wallets: [
                {
                    id: 1,
                    user_id: 1,
                    wallet_address: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
                    is_primary: true,
                    created_at: "2023-01-01T00:00:00.000Z",
                },
            ],
        },
    })

export const UserListSchema = z.array(UserResponseSchema)

// ====================================================================================================
// Request Body Schemas

export const UserQuerySchema = z
    .object({
        primary_wallet: z.string().refine(isHex).optional(),
        username: z.string().optional(),
        include_wallets: z.boolean().optional().default(false),
    })
    .strict()
    .refine((data) => data.primary_wallet !== undefined || data.username !== undefined, {
        message: "At least one filter (primary_wallet or username) must be provided",
    })
    .openapi({
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
            include_wallets: true,
        },
    })

export const UserCreateRequestSchema = z
    .object({
        primary_wallet: z.string().refine(isHex),
        username: z.string(),
    })
    .strict()
    .openapi({
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
        },
    })

export const UserUpdateRequestSchema = z
    .object({
        username: z.string().optional(),
    })
    .strict()
    .openapi({
        example: {
            username: "new_username",
        },
    })

export const UserWalletRequestSchema = z
    .object({
        wallet_address: z.string().refine(isHex),
    })
    .strict()
    .openapi({
        example: {
            wallet_address: "0x1a2b3c4d5e6f7A8B9C0D1E2F3a4b5c6d7e8f9a0b",
        },
    })

// ====================================================================================================
// Request Param Schemas

export const UserIdParamSchema = z
    .object({
        id: z.string().transform((val) => Number.parseInt(val)),
    })
    .openapi({
        param: {
            name: "id",
            in: "path",
        },
        example: {
            id: "1",
        },
    })

export const PrimaryWalletParamSchema = z
    .object({
        primary_wallet: z.string().refine(isHex, { message: "Primary wallet address must be a valid hex string" }),
    })
    .openapi({
        param: {
            name: "primary_wallet",
            in: "path",
        },
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })
