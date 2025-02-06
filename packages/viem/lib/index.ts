import { type HappyUser, happyProvider, onUserUpdate } from "@happy.tech/core"
import {
    type CustomTransport,
    type ParseAccount,
    type PublicClient,
    type PublicRpcSchema,
    type WalletClient,
    type WalletRpcSchema,
    createPublicClient,
    createWalletClient,
    custom,
} from "viem"

export type HappyPublicClient = PublicClient<
    CustomTransport,
    undefined,
    ParseAccount<`0x${string}`>,
    [...PublicRpcSchema]
>

export function createHappyPublicClient(): HappyPublicClient {
    return createPublicClient({ transport: custom(happyProvider) })
}

export type HappyWalletClient = WalletClient<
    CustomTransport,
    undefined,
    ParseAccount<`0x${string}`>,
    [...WalletRpcSchema]
>

export function createHappyWalletClient(): HappyWalletClient {
    let walletClient: HappyWalletClient | undefined = undefined
    onUserUpdate((user: HappyUser | undefined) => {
        walletClient = user
            ? (createWalletClient({ account: user.address, transport: custom(happyProvider) }) as HappyWalletClient)
            : undefined
    })
    return new Proxy<HappyWalletClient>({} as HappyWalletClient, {
        get(_target, prop, _receiver) {
            if (!walletClient) throw new Error(`Cannot call wallet.${String(prop)}: User is not connected`)
            return prop in walletClient && typeof prop === "string"
                ? (walletClient as HappyWalletClient)[prop as keyof HappyWalletClient]
                : undefined
        },
    })
}
