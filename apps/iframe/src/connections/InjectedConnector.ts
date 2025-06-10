import { type Hex, createUUID, getProp, promiseWithResolvers } from "@happy.tech/common"
import type {
    ConnectionProvider,
    EIP6963ProviderDetail,
    HappyUser,
    MsgsFromApp,
    MsgsFromWallet,
} from "@happy.tech/wallet-common"
import { EIP1193UnauthorizedError, EIP1193UserRejectedRequestError, Msgs, WalletType } from "@happy.tech/wallet-common"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider"
import { getCurrentChain } from "#src/state/chains"
import { setInjectedProvider } from "#src/state/injectedProvider"
import { walletID } from "#src/utils/appURL"
import { createHappyUserFromWallet } from "#src/utils/createHappyUserFromWallet"
import { appMessageBus } from "../services/eventBus"
import { StorageKey, storage } from "../services/storage"
import { grantPermissions } from "../state/permissions"
import { getAppURL, isStandaloneWallet } from "../utils/appURL"
import { InjectedProviderProxy } from "./InjectedProviderProxy"

/**
 * A connector for interacting with browser-injected wallets through EIP-6963.
 * ({@link https://eips.ethereum.org/EIPS/eip-6963}).
 * Manages wallet connections, permissions, and state synchronization between
 * the application and iframe contexts.
 *
 * @implements {ConnectionProvider}
 * @example
 * ```ts
 * // find details
 * import { createStore } from 'mipd'
 * const store = createStore()
 * const metamaskDetails = store.findProvider({ rdns: 'io.metamask' }

 * const connector = new InjectedConnector(metamaskDetails)
 * await connector.connect({ method: 'eth_requestAccounts' })
 * // user is now authenticated & connected via metamask
 * await connector.disconnect()
 * // user is now un-authenticated & RPC calls will fallback to the default public provider
 * ```
 */
export class InjectedConnector implements ConnectionProvider {
    public readonly type: string
    public readonly id: string
    public readonly name: string
    public readonly icon: string

    public readonly detail: EIP6963ProviderDetail

    constructor(opts: {
        info: EIP6963ProviderDetail["info"]
        provider: EIP6963ProviderDetail["provider"]
        autoConnect: boolean
    }) {
        this.detail = {
            info: opts.info,
            provider: opts.provider,
        }

        this.type = WalletType.Injected
        this.id = `${this.type}:${opts.info.rdns}`
        this.name = opts.info.name
        this.icon = opts.info.icon

        // reconnect logic
        if (opts.autoConnect) {
            void this.attemptReconnect()
        }
    }

    public async onConnect(user: HappyUser, provider: EIP1193Provider) {
        await setUserWithProvider(user, provider)
        grantPermissions(getAppURL(), "eth_accounts")
    }

    public async onReconnect(user: HappyUser, provider: EIP1193Provider) {
        await setUserWithProvider(user, provider)
    }

    public async onDisconnect() {
        await setUserWithProvider(undefined, undefined)
    }

    public async connect(
        req: MsgsFromApp[Msgs.ConnectRequest],
        signal: AbortSignal,
    ): Promise<MsgsFromWallet[Msgs.ConnectResponse]> {
        const { user, request, response } = await this.connectToInjectedWallet(req)
        if (signal.aborted) throw new Error("Connection aborted by user")
        this.setProvider()
        await this.onConnect(user, InjectedProviderProxy.getInstance() as EIP1193Provider)
        return { request, response }
    }

    public async disconnect() {
        // see note at GoogleConnector.onDisconnect on why storage access vs atom usage here.
        const past = storage.get(StorageKey.HappyUser)

        // ensure we clear the right one
        if (past?.provider === this.id) {
            this.clearProvider()
            this.onDisconnect()
        }
    }

    private async attemptReconnect() {
        const past = storage.get(StorageKey.HappyUser)
        if (past?.provider !== this.id) return

        /**
         * Here for pageload re-connect we will use eth_accounts instead of eth_requestAccounts.
         * Since this is a re-connect, and not an initial connection, we don't want to prompt the
         * user. If the permissions have been revoked in the injected wallet, no user accounts will
         * be found, and we will instead disconnect as that is likely the users true intent.
         */
        const reconnectRequest = {
            key: createUUID(), // it's ok, there are no pending promises to be resolved by this
            windowId: walletID(), // reconnect was initialized internally, so the request is from iframe
            payload: { method: "eth_accounts" },
            error: null,
        } as const

        try {
            const { user } = await this.connectToInjectedWallet(reconnectRequest)
            this.setProvider()
            this.onReconnect(user, InjectedProviderProxy.getInstance() as EIP1193Provider)
        } catch {
            this.disconnect()
        }
    }

    /**
     * Sets the current provider as the connected injected provider
     */
    private setProvider() {
        setInjectedProvider(this.detail.provider)
    }

    private clearProvider() {
        setInjectedProvider(undefined)
    }

    /**
     * Returns the active provider to execute requests, dependant on context.
     */
    private get provider() {
        return isStandaloneWallet() ? this.detail.provider : InjectedProviderProxy.getInstance()
    }

    private async connectToInjectedWallet(
        request: MsgsFromApp[Msgs.ConnectRequest],
    ): Promise<{ user: HappyUser } & MsgsFromWallet[Msgs.ConnectResponse]> {
        // not in iframe (direct access)
        if (isStandaloneWallet()) {
            // fetch the response
            const response = await this.detail.provider.request(request.payload)

            // get user accounts (if the request was wallet_requestAccounts, we must re-fetch with eth_accounts)
            const [address] = ["eth_requestAccounts", "eth_accounts"].includes(request.payload.method)
                ? (response as Hex[])
                : await this.detail.provider.request({ method: "eth_accounts" })

            if (!address) throw new EIP1193UnauthorizedError()

            const user = await createHappyUserFromWallet(this.id, address)
            await this.switchInjectedWalletToHappyChain()
            return { user, request, response }
        }

        // (embedded in iframe)
        // we can't execute InjectedProviderProxy.getInstance().request(request.payload) yet, as the app-side
        // may have multiple injected providers available, and we have not yet selected one.
        // This will ensure the correct one is selected, connected, and executed. It will prepare
        // the app for all subsequent requests to be executed against the same injected provider
        void appMessageBus.emit(Msgs.InjectedWalletRequestConnect, { rdns: this.detail.info.rdns, request })

        const { promise, resolve, reject } = promiseWithResolvers<
            { user: HappyUser } & MsgsFromWallet[Msgs.ConnectResponse]
        >()

        const unsubscribe = appMessageBus.on(
            Msgs.InjectedWalletConnected,
            async ({ rdns, address, request: _request, response }) => {
                if (request.key !== _request?.key) return

                unsubscribe()

                if (!rdns || rdns !== this.detail.info.rdns) return reject(new EIP1193UserRejectedRequestError())
                if (!address) return reject(new EIP1193UnauthorizedError())

                const user = await createHappyUserFromWallet(this.id, address)
                return this.switchInjectedWalletToHappyChain()
                    .then(() => resolve({ user, request, response }))
                    .catch((err) => reject(err))
            },
        )

        return promise
    }

    private async switchInjectedWalletToHappyChain() {
        try {
            const configuredChain = getCurrentChain()
            // Ensures the chain has been added to the injected wallet
            await this.provider.request({
                method: "wallet_addEthereumChain",
                params: [
                    {
                        chainId: configuredChain.chainId,
                        chainName: configuredChain.chainName,
                        rpcUrls: configuredChain.rpcUrls,
                        iconUrls: [],
                        nativeCurrency: configuredChain.nativeCurrency,
                        blockExplorerUrls: configuredChain.blockExplorerUrls,
                    },
                ],
            })
            // Ensures the chain has been selected (will not prompt)
            await this.provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: configuredChain.chainId }],
            })
        } catch (e) {
            // Hotfix for MetaMask, tracking: https://github.com/MetaMask/metamask-extension/issues/33213
            if (getProp(e, "message", "string")?.includes("is not a function")) return
            throw e
        }
    }
}
