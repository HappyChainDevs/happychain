import { FirebaseConnector } from "@happychain/firebase-web3auth-strategy"
import { googleLogo } from "@happychain/firebase-web3auth-strategy/lib/logos"
import { AuthState, type HappyUser, WalletType } from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider.ts"
import { setAuthState } from "#src/state/authState.ts"
import { getChains } from "#src/state/chains.ts"
import { grantPermissions } from "#src/state/permissions.ts"
import { getUser } from "#src/state/user.ts"
import { getAppURL } from "#src/utils/appURL.ts"
import { emitUserUpdate } from "#src/utils/emitUserUpdate.ts"

export class GoogleConnector extends FirebaseConnector {
    constructor() {
        super({
            name: "Google",
            icon: googleLogo,
        })
    }

    onDisconnect(_: undefined, provider: EIP1193Provider) {
        if (getUser()?.type !== WalletType.Social) return
        setUserWithProvider(undefined, provider)
        setAuthState(AuthState.Disconnected)
        // TODO: remove and centralize emitUserUpdate
        emitUserUpdate(undefined)
    }

    onReconnect(user: HappyUser, provider: EIP1193Provider) {
        setUserWithProvider(user, provider)
        setAuthState(AuthState.Connected)
        // TODO: remove and centralize emitUserUpdate
        emitUserUpdate(user)
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
        setAuthState(AuthState.Connected)
        // TODO: remove and centralize emitUserUpdate
        emitUserUpdate(user)
    }
}
