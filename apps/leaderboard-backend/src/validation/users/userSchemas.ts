import { z } from "@hono/zod-openapi"
import { resolver } from "hono-openapi/zod"
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

const UserResponseSchema = z
    .object({
        id: z.number().int(),
        primary_wallet: z.string().refine(isHex),
        username: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        wallets: z.array(UserWalletSchema).optional(),
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

export const UserResponseSchemaObj = resolver(UserResponseSchema)

// ====================================================================================================
// Request Body Schemas

export const UserQuerySchema = z
    .object({
        wallet_address: z.string().refine(isHex).optional(),
        username: z.string().optional(),
        include_wallets: z.boolean().optional().default(false),
    })
    .strict()
    .refine((data) => data.wallet_address !== undefined || data.username !== undefined, {
        message: "At least one filter (wallet_address or username) must be provided",
    })
    .openapi({
        example: {
            wallet_address: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
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

export const UserWalletAddRequestSchema = z
    .object({
        wallet_address: z.string().refine(isHex),
        set_as_primary: z.boolean().optional().default(false),
    })
    .strict()
    .openapi({
        example: {
            wallet_address: "0x1a2b3c4d5e6f7A8B9C0D1E2F3a4b5c6d7e8f9a0b",
            set_as_primary: false,
        },
    })

// ====================================================================================================
// Request Param Schemas

export const UserIdParamSchema = z
    .object({
        id: z.string().regex(/^\d+$/, { message: "User ID must be a number" }),
    })
    .strict()
    .openapi({
        param: {
            name: "id",
            in: "path",
        },
        example: {
            id: "1",
        },
    })

export const WalletAddressParamSchema = z
    .object({
        addr: z.string().refine(isHex, { message: "Wallet address must be a valid hex string" }),
    })
    .strict()
    .openapi({
        example: {
            addr: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })
