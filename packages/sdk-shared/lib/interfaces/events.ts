import type { UUID } from "../utils/uuid"
import type { EIP1193RequestParameters } from "./eip1193Provider"
import type { AuthState, HappyUser } from "./happyUser"

export type MessageChannelEventPayload<T = unknown> = {
    // request event unique key
    key: UUID
    // window identifier
    windowId: UUID
    payload: T
}

/**
 * When RDNS is undefined a disconnect occurs, when its a string
 * an EIP-6963 lookup occurs for this wallet to connect on dapp side
 */
export type WalletRDNS = string | undefined

type EIP1193RequestParametersWithPermissions =
    | { method: "eth_accounts" }
    | { method: "eth_requestAccounts" }
    | { method: "wallet_requestPermissions" }
    | { method: "wallet_revokePermissions" }

type EIP119PermissionsRequest = Extract<EIP1193RequestParameters, EIP1193RequestParametersWithPermissions>

const methods = [
    "eth_accounts",
    "eth_requestAccounts",
    "wallet_requestPermissions",
    "wallet_revokePermissions",
] as const
function arrayIncludes<T>(array: readonly T[], element: T): boolean {
    return array.includes(element)
}
export function isPermissionsRequest(args: { method: string; params?: unknown }): args is EIP119PermissionsRequest {
    return arrayIncludes(methods, args.method)
}
export interface HappyEvents {
    // called once after iframe has loaded and initialized
    "iframe-init": boolean

    // modal states
    "modal-toggle": boolean

    "request-display": "login-modal"

    // user auth
    "auth-changed": HappyUser | undefined

    // unauthenticated,authenticated,loading
    "auth-state": AuthState

    /**
     * Sent by the iframe to request a connection or disconnection with an injected wallet.
     * Received by the dapp, which attempts to connect with the wallet whose rdns matches.
     */
    "injected-wallet:requestConnect": WalletRDNS

    /**
     * Sent by the dapp in response to `injected-wallet:requestConnect` with the user details obtained from
     * connecting to the requested injected wallet. If the connection attempt failed, the user will
     * be undefined.
     *
     * Alternatively sent by the dapp as a response to other dapp side events such as
     * when the injected wallet disconnect or changes account and the iframe needs to be updated
     */
    "injected-wallet:connect": { rdns: string; address: `0x${string}` } | { rdns?: undefined; address?: undefined }

    "injected-wallet:mirror-permissions": {
        request: EIP119PermissionsRequest
        response: unknown
    }
}