import { createUUID, promiseWithResolvers } from "@happychain/common"
import { type EIP1193RequestParameters, Msgs } from "@happychain/sdk-shared"
import { SafeEventEmitter } from "@happychain/sdk-shared"
import { iframeID } from "#src/requests/utils.ts"
import { happyProviderBus } from "#src/services/eventBus.ts"

export class InjectedProviderProxy extends SafeEventEmitter {
    inFlight = new Map()

    constructor() {
        super()
        happyProviderBus.on(Msgs.ExecuteInjectedResponse, (resp) => {
            const pending = this.inFlight.get(resp.key)
            console.log({ iframe: resp, pending })
            if (!pending) return
            if (pending.reject && resp.error) pending.reject(resp.error)
            pending.resolve(resp.payload)
        })
    }

    request(args: EIP1193RequestParameters) {
        console.log({ requesting: args })
        const key = createUUID()

        const { promise, resolve, reject } = promiseWithResolvers()

        const req = {
            key,
            windowId: iframeID(),
            error: null,
            payload: args,
        }

        // 1. send request to dapp
        happyProviderBus.emit(Msgs.ExecuteInjectedRequest, req)

        // 2. dapp executes request
        this.inFlight.set(key, { resolve, reject, request: req })

        // 3. dapp returns response
        return promise
    }
}
