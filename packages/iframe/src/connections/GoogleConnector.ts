import { type HappyUser, WalletType } from "@happychain/sdk-shared"
import { connect, disconnect } from "@wagmi/core"
import { type AuthProvider, GoogleAuthProvider } from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider.ts"
import { StorageKey, storage } from "#src/services/storage.ts"
import { getChains } from "#src/state/chains.ts"
import { grantPermissions } from "#src/state/permissions.ts"
import { getAppURL } from "#src/utils/appURL.ts"
import { config } from "#src/wagmi/config.ts"
import { happyConnector } from "#src/wagmi/connector.ts"
import { FirebaseConnector } from "./firebase"
import { googleLogo } from "./firebase/logos"

/**
 * A connector for handling Google social authentication in the Happy Wallet.
 * Extends FirebaseConnector to provide Google-specific sign-in flows.
 *
 * This connector manages the lifecycle of a wallet user's signing in with their Google account. It handles :
 * - Initial connection and chain setup
 * - Reconnection scenarios
 * - Disconnection cleanup
 *
 * @extends FirebaseConnector
 * @example
 * ```ts
 * const connector = new GoogleConnector()
 * await connector.connect({ method: 'eth_requestAccounts' })
 * // user is now authenticated via firebase (google)
 * // & connected via web3Auth, ready to make transactions
 * await connector.disconnect()
 * // user is now un-authenticated & only public RPC calls
 * // can be made
 * ```
 */
export class GoogleConnector extends FirebaseConnector {
    constructor() {
        super({
            name: "Google",
            icon: googleLogo,
        })
    }

    getAuthProvider(): AuthProvider {
        const googleProvider = new GoogleAuthProvider()
        // forces select account screen on every connect
        googleProvider.setCustomParameters({ prompt: "select_account" })
        return googleProvider
    }

    async onDisconnect() {
        /**
         * Note: its important to check user in localStorage here instead of userAtom for
         * the page-load reconnect to work properly.
         *
         * 'userAtom' is undefined on page load, and is set after a successful login attempt is made.
         * In the event that something goes sideways on page-load/reconnect where the user is
         * set in localStorage, but fails to authenticate for some reason, the reconnect will attempt
         * a disconnect to clear everything and start fresh. Since the user isn't actually connected
         * yet, `userAtom` will be undefined, and so getUser()?.type will not be WalletType.Social
         * and the user cache in localStorage here will never be cleared properly, causing this process
         * to repeat on the next page refresh.
         */
        if (storage.get(StorageKey.HappyUser)?.type !== WalletType.Social) return
        await disconnect(config)
        setUserWithProvider(undefined, undefined)
    }

    async onReconnect(user: HappyUser, provider: EIP1193Provider) {
        setUserWithProvider(user, provider)
        await connect(config, { connector: happyConnector })
    }

    async onConnect(user: HappyUser, provider: EIP1193Provider) {
        if (user && provider) {
            await Promise.allSettled(
                Object.values(getChains()).map((chain) => {
                    provider.request({ method: "wallet_addEthereumChain", params: [chain] })
                }),
            )
        }
        setUserWithProvider(user, provider)
        grantPermissions(getAppURL(), "eth_accounts")
        await connect(config, { connector: happyConnector })
    }
}
