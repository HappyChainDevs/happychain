import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import { UserResponseSchema } from "../users"

// ====================================================================================================
// Response Schemas

// Auth response data schema (without the wrapper)
export const AuthResponseDataSchema = z
    .object({
        session_id: z.string().uuid(),
        user: UserResponseSchema,
    })
    .strict()
    .openapi({
        example: {
            session_id: "123e4567-e89b-12d3-a456-426614174000",
            user: {
                id: 1,
                username: "username",
                primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
                created_at: "2023-01-01T00:00:00.000Z",
                updated_at: "2023-01-01T00:00:00.000Z",
                wallets: [],
            },
        },
    })

// Auth challenge data schema (without the wrapper)
export const AuthChallengeDataSchema = z
    .object({
        message: z.string(),
        primary_wallet: z.string().refine(isHex),
    })
    .strict()
    .openapi({
        example: {
            message: "HappyChain Authentication: 1a2b3c4d5e6f7890 (1620000000000)",
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

// Session list data schema (without the wrapper)
export const SessionListDataSchema = z
    .array(
        z.object({
            id: z.string().uuid(),
            primary_wallet: z.string().refine(isHex),
            created_at: z.string(),
            last_used_at: z.string(),
            is_current: z.boolean(),
        }),
    )
    .openapi({
        example: [
            {
                id: "123e4567-e89b-12d3-a456-426614174000",
                primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
                created_at: "2023-01-01T00:00:00.000Z",
                last_used_at: "2023-01-01T00:00:00.000Z",
                is_current: true,
            },
        ],
    })

// ====================================================================================================
// Request Body Schemas

export const AuthChallengeRequestSchema = z
    .object({
        primary_wallet: z.string().refine(isHex),
    })
    .strict()
    .openapi({
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

export const AuthVerifyRequestSchema = z
    .object({
        primary_wallet: z.string().refine(isHex),
        message: z.string(),
        signature: z.string().refine(isHex),
    })
    .strict()
    .openapi({
        example: {
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            message: "HappyChain Authentication: 1a2b3c4d5e6f7890 (1620000000000)",
            signature:
                "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
    })

export const SessionIdRequestSchema = z
    .object({
        session_id: z.string().uuid("Invalid session ID"),
    })
    .strict()
    .openapi({
        example: {
            session_id: "123e4567-e89b-12d3-a456-426614174000",
        },
    })
