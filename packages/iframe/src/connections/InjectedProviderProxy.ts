import { createUUID, promiseWithResolvers } from "@happychain/common"
import {
    type EIP1193ErrorObject,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    GenericProviderRpcError,
    Msgs,
    type ProviderEventError,
    type ProviderEventPayload,
} from "@happychain/sdk-shared"
import { SafeEventEmitter } from "@happychain/sdk-shared"
import { iframeID } from "#src/requests/utils.ts"
import { happyProviderBus } from "#src/services/eventBus.ts"
import { getInjectedProvider } from "#src/state/injectedProvider.ts"
import { isStandaloneIframe } from "#src/utils/appURL.ts"
import { iframeProvider } from "#src/wagmi/provider.ts"

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
 * @see https://eips.ethereum.org/EIPS/eip-6963 - EIP-6963 Multi Injected Provider Discovery
 */
export class InjectedProviderProxy extends SafeEventEmitter {
    private inFlight = new Map()

    private isStandalone = isStandaloneIframe()

    constructor() {
        super()

        if (!this.isStandalone) {
            happyProviderBus.on(Msgs.ExecuteInjectedResponse, this.handleRequestResolution.bind(this))
        }
    }

    async request(args: EIP1193RequestParameters) {
        const req = {
            key: createUUID(),
            windowId: iframeID(),
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
        if (!provider) throw new Error("Failed for find injected provider")
        return await provider.request(req.payload as Parameters<typeof provider.request>[number])
    }

    private async executeRemote(req: ProviderEventPayload<EIP1193RequestParameters>) {
        const { promise, resolve, reject } = promiseWithResolvers()
        happyProviderBus.emit(Msgs.ExecuteInjectedRequest, req)
        this.inFlight.set(req.key, { resolve, reject, request: req })
        return promise
    }

    public handleRequestResolution(
        resp: ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>,
    ): void {
        const iframeRequest = resp.windowId === iframeID()
        const pending = this.inFlight.get(resp.key)
        if (!pending && iframeRequest) iframeProvider.handleRequestResolution(resp)
        else if (pending?.reject && resp.error) pending.reject(new GenericProviderRpcError(resp.error))
        else if (pending?.resolve) pending.resolve(resp.payload)
    }
}
