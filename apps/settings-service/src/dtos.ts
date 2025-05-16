import { isAddress } from "@happy.tech/common"
import { checksum } from "ox/Address"
import { z } from "zod"
import { isAppUrl } from "./utils/isAppUrl"
import { isUUID } from "./utils/isUUID"

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
    id: z.string().refine(isUUID).openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
    updatedAt: z.number().openapi({ example: 1715702400 }),
    deleted: z.boolean().openapi({ example: false }),
})
