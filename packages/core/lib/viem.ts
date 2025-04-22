import type { HappyUser } from "@happy.tech/wallet-common"
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
import { onUserUpdate } from "./functions"
import { happyProvider } from "./happyProvider"

/**
 * Return type for {@link createHappyPublicClient}.
 */
// Interface so as to not pollute the documentation page for createHappyPublicClient
// biome-ignore format: readability
export interface HappyPublicClient extends PublicClient<
    CustomTransport,
    undefined,
    ParseAccount<`0x${string}`>,
    [...PublicRpcSchema]
> {}

/**
 * Returns a Viem PublicClient instance configured for use with the Happy Wallet.
 */
export function createHappyPublicClient(): HappyPublicClient {
    return createPublicClient({ transport: custom(happyProvider) })
}

/**
 * Return type for {@link createHappyWalletClient}.
 */
// Interface so as to not pollute the documentation page for createHappyWalletClient
// biome-ignore format: readability
export interface HappyWalletClient extends WalletClient<
    CustomTransport,
    undefined,
    ParseAccount<`0x${string}`>,
    [...WalletRpcSchema]
> {}

/**
 * Returns a Viem WalletClient instance made configured for use with the Happy Wallet.
 *
 * The client is initialized without an account, and it cannot be used until the user connects. The
 * client object is update in-place with the account as soon as the user connects to the wallet (no
 * need to call this function again).
 */
export function createHappyWalletClient(): HappyWalletClient {
    let walletClient: HappyWalletClient | undefined = undefined
    onUserUpdate((user: HappyUser | undefined) => {
        walletClient = user
            ? (createWalletClient({ account: user.address, transport: custom(happyProvider) }) as HappyWalletClient)
            : undefined
    })
    return new Proxy<HappyWalletClient>({} as HappyWalletClient, {
        get(_target, prop, _receiver) {
            if (!walletClient) {
                throw new Error(`Cannot call wallet.${String(prop)}: User is not connected`)
            }
            if (!(prop in walletClient && typeof prop === "string")) {
                throw new Error(`Cannot call wallet.${String(prop)}: Not a function`)
            }

            return (walletClient as HappyWalletClient)[prop as keyof HappyWalletClient]
        },
    })
}
