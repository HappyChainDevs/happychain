import { isAddress } from "@happy.tech/common"
import { checksum } from "ox/Address"
import { z } from "zod"
import { isAppUrl } from "./utils/isAppUrl"

export const walletPermission = z.object({
    type: z.literal("WalletPermissions").openapi({
        example: "WalletPermissions",
        type: "string",
    }),
    user: z.string().refine(isAddress).transform(checksum).openapi({
        example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        type: "string",
    }),
    invoker: z.string().refine(isAppUrl).openapi({ example: "https://app.happy.tech" }),
    parentCapability: z.string().openapi({ example: "eth_accounts" }),
    caveats: z.array(
        z.object({
            type: z.string().openapi({ example: "target" }),
            value: z.string().openapi({ example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }),
        }),
    ),
    date: z.number().openapi({ example: 1715702400 }),
    id: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
    updatedAt: z.number().openapi({ example: 1715702400 }),
    createdAt: z.number().openapi({ example: 1715702400 }),
    deleted: z.boolean().openapi({ example: false }),
})

export type WalletPermission = z.infer<typeof walletPermission>

export const walletPermissionUpdate = walletPermission.partial().extend({
    type: z.literal("WalletPermissions").openapi({
        example: "WalletPermissions",
        type: "string",
    }),
    user: z.string().refine(isAddress).transform(checksum).openapi({
        example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        type: "string",
    }),
    id: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
})

export type WalletPermissionUpdate = z.infer<typeof walletPermissionUpdate>

export const configChangedEvent = z.object({
    event: z.enum(["config.changed"]),
    data: z.object({
        destination: z.string().refine(isAddress).transform(checksum).openapi({
            example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            type: "string",
        }),
        resourceId: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
        updatedAt: z.number().openapi({ example: 1715702400 }),
    }),
    id: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
})

export type ConfigChangedEvent = z.infer<typeof configChangedEvent>

export const watchAsset = z.object({
    type: z.literal("ERC20").openapi({
        example: "ERC20",
        type: "string",
    }),
    user: z.string().refine(isAddress).transform(checksum).openapi({
        example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        type: "string",
    }),
    options: z.object({
        address: z.string().refine(isAddress).transform(checksum).openapi({
            example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            type: "string",
        }),
        symbol: z.string().openapi({ example: "ETH" }),
        decimals: z.number().openapi({ example: 18 }),
        image: z.string().optional().openapi({ example: "https://example.com/logo.png" }),
    }),
    id: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
    updatedAt: z.number().openapi({ example: 1715702400 }),
    createdAt: z.number().openapi({ example: 1715702400 }),
    deleted: z.boolean().openapi({ example: false }),
})

export type WatchAsset = z.infer<typeof watchAsset>

export const watchAssetUpdate = watchAsset.partial().extend({
    type: z.literal("ERC20").openapi({
        example: "ERC20",
        type: "string",
    }),
    user: z.string().refine(isAddress).transform(checksum).openapi({
        example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        type: "string",
    }),
    id: z.string().openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
})

export type WatchAssetUpdate = z.infer<typeof watchAssetUpdate>
