import type { Address } from "@happy.tech/common"
import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { UserTableId } from "../../db/types"

// User wallet schema
export const UserWalletSchema = z
    .object({
        id: z.number().int(),
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        wallet_address: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
        is_primary: z.boolean(),
        created_at: z.string().datetime(),
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

// User API response schema (for GET, POST responses)
export const UserResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        primary_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
        username: z.string(),
        created_at: z.string().datetime(),
        updated_at: z.string().datetime(),
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

// User query schema for GET /users (query params)
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

// User creation request schema (for POST /users)
export const UserCreateRequestSchema = z
    .object({
        primary_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
        username: z.string(),
    })
    .strict()
    .openapi({
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
        },
    })

// User update request schema (for PATCH /users/:id)
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

// User wallet add request schema (for POST /users/:id/wallets)
export const UserWalletAddRequestSchema = z
    .object({
        wallet_address: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
        set_as_primary: z.boolean().optional().default(false),
    })
    .strict()
    .openapi({
        example: {
            wallet_address: "0x1a2b3c4d5e6f7A8B9C0D1E2F3a4b5c6d7e8f9a0b",
            set_as_primary: false,
        },
    })

// User wallet update request schema (for PATCH /users/:id/wallets/:addr)
export const UserWalletUpdateRequestSchema = z
    .object({
        set_as_primary: z.boolean().default(true),
    })
    .strict()
    .openapi({
        example: {
            set_as_primary: true,
        },
    })

// User wallets list response schema (for GET /users/:id/wallets)
export const UserWalletsResponseSchema = z.array(UserWalletSchema).openapi({
    example: [
        {
            id: 1,
            user_id: 1,
            wallet_address: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            is_primary: true,
            created_at: "2023-01-01T00:00:00.000Z",
        },
        {
            id: 2,
            user_id: 1,
            wallet_address: "0x1a2b3c4d5e6f7A8B9C0D1E2F3a4b5c6d7e8f9a0b",
            is_primary: false,
            created_at: "2023-01-02T00:00:00.000Z",
        },
    ],
})

// Wallet path parameter schema (for endpoints with :addr)
export const WalletAddressParamSchema = z
    .object({
        addr: z
            .string()
            .refine(isHex, { message: "Wallet address must be a valid hex string" })
            .transform((val) => val as Address),
    })
    .strict()
    .openapi({
        example: {
            addr: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

// User ID path parameter schema (for endpoints with :id)
export const UserIdParamSchema = z
    .object({
        id: z
            .string()
            .regex(/^\d+$/, { message: "User ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as UserTableId),
    })
    .strict()
    .openapi({
        example: {
            id: "1",
        },
    })
