import { createUUID, promiseWithResolvers } from "@happy.tech/common"
import type { SerializedRpcError } from "@happy.tech/wallet-common"
import {
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type ProviderEventError,
    type ProviderEventPayload,
    SafeEventEmitter,
    standardizeRpcError,
} from "@happy.tech/wallet-common"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "#src/actions/setUserWithProvider"
import { happyProviderBus } from "#src/services/eventBus"
import { getInjectedProvider } from "#src/state/injectedProvider"
import { grantPermissions } from "#src/state/permissions"
import { getUser } from "#src/state/user"
import { getAppURL, isStandaloneWallet, walletID } from "#src/utils/appURL"
import { createHappyUserFromWallet } from "#src/utils/createHappyUserFromWallet"
import { iframeProvider } from "#src/wagmi/provider"

/**
 * A proxy implementation of the EIP-1193 provider interface
 * ({@link https://eips.ethereum.org/EIPS/eip-1193}) that manages request negotiation
 * with injected wallets across different contexts.
 *
 * This provider serves as a unified interface for wallet interactions:
 * - In standalone mode (direct access): Uses the EIP-6963 detected provider directly
 * - In embedded mode (within another app): Forwards requests to the parent application
 *   where the user's wallet connection can execute the request
 *
 * This architecture provides a single entry point for executing requests with an injected wallet,
 * regardless of whether the wallet is in standalone or embedded mode, and manages request routing
 * based on wallet context (standalone/embedded in another application)
 *
 * @extends SafeEventEmitter
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-6963} - EIP-6963 Multi Injected Provider Discovery
 */
export class InjectedProviderProxy extends SafeEventEmitter {
    private static instance: InjectedProviderProxy

    static getInstance() {
        InjectedProviderProxy.instance ??= new InjectedProviderProxy()
        return InjectedProviderProxy.instance
    }

    private inFlight = new Map()

    private isStandalone = isStandaloneWallet()

    private constructor() {
        super()

        if (!this.isStandalone) {
            happyProviderBus.on(Msgs.ExecuteInjectedResponse, this.handleRequestResolution.bind(this))
            happyProviderBus.on(Msgs.ForwardInjectedEvent, this.forwardInjectedEventRemote.bind(this))
        } else {
            this.forwardInjectedEventLocal()
        }
    }

    async request(args: EIP1193RequestParameters) {
        const req = {
            key: createUUID(),
            windowId: walletID(),
            error: null,
            payload: args,
        }

        if (this.isStandalone) {
            return await this.executeLocal(req)
        }

        return await this.executeRemote(req)
    }

    private async executeLocal(req: ProviderEventPayload<EIP1193RequestParameters>) {
        const provider = getInjectedProvider()
        if (!provider) throw new Error("Failed for find injected provider in HappyWallet")
        return await provider.request(req.payload as Parameters<typeof provider.request>[number])
    }

    private async executeRemote(request: ProviderEventPayload<EIP1193RequestParameters>) {
        const { promise, resolve, reject } = promiseWithResolvers()
        happyProviderBus.emit(Msgs.ExecuteInjectedRequest, request)
        this.inFlight.set(request.key, { resolve, reject, request })
        return promise
    }

    /**
     * Called in response to {@link Msgs.ExecuteInjectedResponse} or by the injected request handler
     * in direct (non-embedded) mode.
     */
    public handleRequestResolution(
        resp: ProviderEventError<SerializedRpcError> | ProviderEventPayload<EIP1193RequestResult>,
    ): void {
        const iframeRequest = resp.windowId === walletID()
        const pending = this.inFlight.get(resp.key)
        if (!pending && iframeRequest) iframeProvider.handleRequestResolution(resp)
        else if (pending?.reject && resp.error) pending.reject(standardizeRpcError(resp.error))
        else if (pending?.resolve) pending.resolve(resp.payload)
    }

    /**
     * Direct-Mode
     */
    private forwardInjectedEventLocal() {
        const provider = getInjectedProvider()
        provider?.on("accountsChanged", async (accounts) => {
            // Forward the event to the front end
            this.emit("accountsChanged", accounts)

            const user = getUser()
            if (!accounts.length) {
                // Logout from the wallet when the user disconnects the injected wallet from the standalone wallet.
                await setUserWithProvider(undefined, undefined)
            } else if (user) {
                const [address] = accounts
                const _user = await createHappyUserFromWallet(user.provider, address)
                await setUserWithProvider(_user, InjectedProviderProxy.getInstance() as EIP1193Provider)
                grantPermissions(getAppURL(), "eth_accounts")
            }
        })
    }

    /**
     * App-Mode: Forward injected events to the parent application
     * handling any internal events as needed.
     */
    private async forwardInjectedEventRemote(req: ProviderEventPayload<{ event: string; params: unknown }>) {
        // Forward the event back to the front end
        this.emit(req.payload.event, req.payload.params)
        // handle any required internal changes
        switch (req.payload.event) {
            case "accountsChanged": {
                const user = getUser()
                if (Array.isArray(req.payload.params) && !req.payload.params.length) {
                    await setUserWithProvider(undefined, undefined)
                } else if (Array.isArray(req.payload.params) && user) {
                    const [address] = req.payload.params
                    const _user = await createHappyUserFromWallet(user.provider, address)
                    await setUserWithProvider(_user, InjectedProviderProxy.getInstance() as EIP1193Provider)
                    grantPermissions(getAppURL(), "eth_accounts")
                }
            }
        }
    }
}
