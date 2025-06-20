import type { Address } from "@happy.tech/common"
import type { Chain, HappyUser } from "@happy.tech/wallet-common"
import { defaultChain, waitForCondition } from "@happy.tech/wallet-common"
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
    zeroAddress,
} from "viem"
import { onUserUpdate } from "./functions"
import { happyProvider } from "./happyProvider"
import { getChain } from "./utils/getChain"
/**
 * Return type for {@link createHappyPublicClient}.
 */
// Interface so as to not pollute the documentation page for createHappyPublicClient
// biome-ignore format: readability
export interface HappyPublicClient extends PublicClient<
    CustomTransport,
    undefined,
    ParseAccount<Address>,
    [...PublicRpcSchema]
> {}

/**
 * Returns a Viem PublicClient instance configured for use with the Happy Wallet.
 */
export function createHappyPublicClient(): HappyPublicClient {
    return createPublicClient({ transport: custom(happyProvider) })
}

export interface HappyWalletClient
    extends WalletClient<CustomTransport, Chain, ParseAccount<Address>, [...WalletRpcSchema]> {}

/**
 * Returns a Viem WalletClient instance made configured for use with the Happy Wallet.
 *
 * The client is initialized without an account, and it cannot be used until the user connects. The
 * client object is update in-place with the account as soon as the user connects to the wallet (no
 * need to call this function again).
 */
export function createHappyWalletClient(): HappyWalletClient {
    let walletClient: HappyWalletClient | undefined
    onUserUpdate((user: HappyUser | undefined) => {
        if (!user) {
            walletClient = undefined
            return
        }

        const account = user.address
        const transport = custom(happyProvider)

        happyProvider
            .request({ method: "eth_chainId" })
            .then((id: `0x${string}`) => {
                walletClient = createWalletClient({ account, transport, chain: getChain(Number(id)) })
            })
            .catch((error) => {
                console.warn(`Failed to fetch chain ID. Defaulting to ${defaultChain.name} (${defaultChain.id})`, error)
                walletClient = createWalletClient({ account, transport, chain: defaultChain })
            })
    })

    return new Proxy<HappyWalletClient>({} as HappyWalletClient, {
        get(_target, prop, _receiver) {
            if (walletClient) return walletClient[prop as keyof HappyWalletClient]

            // This template is used so we can feature detect the methods available on the wallet client
            // without having to wait for the user to connect. don't actually try to execute any methods
            // against this!
            const template = createWalletClient({
                account: zeroAddress,
                transport: custom(happyProvider),
                chain: defaultChain,
            })

            // we can only properly intercept methods (such as `sendTransaction`) and prompt the
            // user to connect/log in first. if properties such as `.chain` or `.account` are accessed
            // we will throw an error, as we simply don't have the available user data yet.
            if (typeof template[prop as keyof HappyWalletClient] !== "function") {
                throw new Error(`Cannot call wallet.${String(prop)}: Wallet is currently unavailable.`)
            }

            /**
             * If theres no walletClient available, we will attempt to log in the user first,
             * then wait for the above listener to set the walletClient before proceeding.
             */
            return (...args: unknown[]) =>
                happyProvider.request({ method: "eth_requestAccounts" }).then(async () => {
                    // wait for wallet client to load
                    await waitForCondition(() => !!walletClient, 5000)

                    const maybeFunc = (walletClient as HappyWalletClient)?.[prop as keyof HappyWalletClient]

                    // Shouldn't happen as 'template' should have the same shape as walletClient
                    if (!maybeFunc || typeof maybeFunc !== "function") {
                        throw new Error(`Cannot call wallet.${String(prop)}: Not a function`)
                    }

                    // @ts-expect-error
                    return maybeFunc(...args)
                })
        },
    })
}
