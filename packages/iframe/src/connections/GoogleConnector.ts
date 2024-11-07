import { AuthState, type HappyUser, WalletType } from "@happychain/sdk-shared"
import { connect, disconnect } from "@wagmi/core"
import { type AuthProvider, GoogleAuthProvider } from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider.ts"
import { setAuthState } from "#src/state/authState.ts"
import { getChains } from "#src/state/chains.ts"
import { grantPermissions } from "#src/state/permissions.ts"
import { getUser } from "#src/state/user.ts"
import { getAppURL } from "#src/utils/appURL.ts"
import { config } from "#src/wagmi/config.ts"
import { happyConnector } from "#src/wagmi/connector.ts"
import { FirebaseConnector } from "./firebase"
import { googleLogo } from "./firebase/logos"

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

    async onDisconnect(_: undefined, _provider: undefined) {
        if (getUser()?.type !== WalletType.Social) return
        await disconnect(config)
        setUserWithProvider(undefined, undefined)
        setAuthState(AuthState.Disconnected)
    }

    async onReconnect(user: HappyUser, provider: EIP1193Provider) {
        setUserWithProvider(user, provider)
        await connect(config, { connector: happyConnector })
        setAuthState(AuthState.Connected)
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
        setAuthState(AuthState.Connected)
    }
}
