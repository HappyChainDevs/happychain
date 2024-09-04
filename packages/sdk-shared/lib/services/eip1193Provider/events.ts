import type {
    EIP1193EventName,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    ProviderEventError,
    ProviderEventPayload,
} from "../../interfaces/eip1193Provider"

import type { EIP1193ErrorObject } from "./errors"

/**
 * Naming Convention:
 * 'request:' => these are user JSON-RPC requests and are sent from the dapp (providerProxy) to the iframe
 *
 * 'provider:' => this is the response the the eip1193 request
 */
export interface EIP1193ProxiedEvents {
    // user approves request
    "request:approve": ProviderEventPayload<EIP1193RequestParameters>
    // user rejects request
    "request:reject": ProviderEventError<EIP1193ErrorObject>

    // request completed (success or fail)
    "response:complete": ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>

    // eip1193 events proxy
    "provider:event": {
        payload: { event: EIP1193EventName; args: unknown }
    }

    // dapp<->iframe permission checks
    "permission-check:request": ProviderEventPayload<EIP1193RequestParameters>
    "permission-check:response": ProviderEventPayload<boolean> | ProviderEventError<unknown>
}
