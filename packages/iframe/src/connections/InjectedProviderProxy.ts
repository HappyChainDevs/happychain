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
import { isStandaloneIframe } from "#src/utils/appURL.ts"
import { iframeProvider } from "#src/wagmi/provider.ts"

export class InjectedProviderProxy extends SafeEventEmitter {
    inFlight = new Map()

    isStandalone = isStandaloneIframe()

    constructor() {
        super()

        if (this.isStandalone) {
            //
        } else {
            this.setupDappListeners()
        }
    }

    request(args: EIP1193RequestParameters) {
        console.log({ aaaargs: args })
        const key = createUUID()

        const { promise, resolve, reject } = promiseWithResolvers()

        const req = {
            key,
            windowId: iframeID(),
            error: null,
            payload: args,
        }

        // 1. send request to dapp
        if (this.isStandalone) {
            //
        } else {
            happyProviderBus.emit(Msgs.ExecuteInjectedRequest, req)
        }

        // 2. dapp executes request
        this.inFlight.set(key, { resolve, reject, request: req })

        // 3. dapp returns response
        return promise
    }

    private setupStandaloneListeners() {
        //
    }

    private setupDappListeners() {
        happyProviderBus.on(Msgs.ExecuteInjectedResponse, this.handleRequestResolution.bind(this))
    }

    public handleRequestResolution(
        resp: ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>,
    ): void {
        const pending = this.inFlight.get(resp.key)
        console.log({ resp, pending, flight: this.inFlight })
        if (!pending) iframeProvider.handleRequestResolution(resp)
        if (pending.reject && resp.error) pending.reject(new GenericProviderRpcError(resp.error))
        if (pending.resolve) pending.resolve(resp.payload)
    }
}
