import { createUUID } from "@happychain/common"
import type {
    ConnectionProvider,
    EIP6963ProviderDetail,
    HappyUser,
    MsgsFromApp,
    MsgsFromIframe,
} from "@happychain/sdk-shared"
import { EIP1193UserRejectedRequestError, Msgs, WalletType } from "@happychain/sdk-shared"
import { connect, disconnect } from "@wagmi/core"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider.ts"
import { config } from "#src/wagmi/config.ts"
import { happyConnector } from "#src/wagmi/connector.ts"
import { iframeID } from "../requests/utils"
import { appMessageBus } from "../services/eventBus"
import { StorageKey, storage } from "../services/storage"
import { grantPermissions, revokePermissions } from "../state/permissions"
import { getAppURL } from "../utils/appURL"
import { createHappyUserFromWallet } from "../utils/createHappyUserFromWallet"

const IsInIframe = window.parent !== window

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
            this.attemptReconnect()
        }

        this.setupPermissionMirror()
    }

    public async onConnect(user: HappyUser, provider: EIP1193Provider) {
        setUserWithProvider(user, provider)
        grantPermissions(getAppURL(), "eth_accounts")
        await connect(config, { connector: happyConnector })
    }

    public async onReconnect(user: HappyUser, provider: EIP1193Provider) {
        setUserWithProvider(user, provider)
        grantPermissions(getAppURL(), "eth_accounts")
        await connect(config, { connector: happyConnector })
    }

    public async onDisconnect() {
        await disconnect(config)
        setUserWithProvider(undefined, undefined)
    }

    public async connect(req: MsgsFromApp[Msgs.ConnectRequest]): Promise<MsgsFromIframe[Msgs.ConnectResponse]> {
        const { user, request, response } = await this.connectToInjectedWallet(req)
        await this.onConnect(user, this.detail.provider)
        return { request, response }
    }

    public async disconnect() {
        const past = storage.get(StorageKey.HappyUser)

        // ensure we clear the right one
        if (past?.provider === this.id) {
            this.onDisconnect()
        }
    }

    private attemptReconnect() {
        const past = storage.get(StorageKey.HappyUser)
        if (past?.type === WalletType.Injected && past?.provider === this.id) {
            const reconnectRequest = {
                key: createUUID(), // its ok, theres no pending promise to be resolved by this
                windowId: iframeID(), // reconnect was initialized internally, so the request can be from iframe
                payload: { method: "eth_requestAccounts" },
                error: null,
            } as const

            this.connectToInjectedWallet(reconnectRequest).then(({ user }: { user: HappyUser }) => {
                this.onReconnect(user, this.detail.provider)
            })
        }
    }

    private setupPermissionMirror() {
        // permission mirroring
        // Whenever the app makes a permissions request to the injected wallet, it will also
        // forward the request and response to the iframe so that we can mirror the permission.
        appMessageBus.on(Msgs.MirrorPermissions, ({ request, response, rdns }) => {
            if (rdns !== this.detail.info.rdns) return
            const hasResponse = Array.isArray(response) && response.length
            const app = getAppURL()
            switch (request.method) {
                case "eth_accounts":
                case "eth_requestAccounts":
                    // Revoke the eth_accounts permission if the response is empty.
                    // biome-ignore format: readability
                    hasResponse
                      ? grantPermissions(app, "eth_accounts")
                      : revokePermissions(app, "eth_accounts")
                    return

                case "wallet_requestPermissions":
                    // We only handle the eth_accounts permission for now, but there is no harm in
                    // setting the permissions that the user has authorized, since we either will be
                    // more permissive (e.g. allow methods only on the basis of eth_accounts and
                    // user approval) or do not support the capability the permission relates to.
                    hasResponse && grantPermissions(app, request.params[0])
                    return

                case "wallet_revokePermissions":
                    request.params && revokePermissions(app, request.params[0])
                    return
            }
        })
    }

    private async connectToInjectedWallet(
        request: MsgsFromApp[Msgs.ConnectRequest],
    ): Promise<{ user: HappyUser } & MsgsFromIframe[Msgs.ConnectResponse]> {
        // not in iframe (direct access)
        if (!IsInIframe) {
            const response = await this.detail.provider.request(request.payload)
            // get user accounts
            const [address] =
                request.payload.method === "eth_requestAccounts"
                    ? (response as `0x${string}`[])
                    : await this.detail.provider.request({ method: "eth_accounts" })

            const user = createHappyUserFromWallet(this.id, address)
            return { user, request, response }
        }

        // in iframe
        void appMessageBus.emit(Msgs.InjectedWalletRequestConnect, { rdns: this.detail.info.rdns, request })
        return await new Promise((resolve, reject) => {
            const unsub = appMessageBus.on(
                Msgs.InjectedWalletConnected,
                ({ rdns, address, request: _request, response }) => {
                    if (request.key !== _request?.key) return

                    unsub()

                    if (!address || !rdns || rdns !== this.detail.info.rdns) {
                        return reject(new EIP1193UserRejectedRequestError())
                    }

                    const user = createHappyUserFromWallet(this.id, address)
                    return resolve({ user, request, response })
                },
            )
        })
    }
}
