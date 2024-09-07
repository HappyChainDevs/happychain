import type { AssertAssignableTo } from "@happychain/common"
import type { EventSchema } from "../services/eventBus"
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

/**
 * Events sent from the app to the iframe on the general message bus.
 */
export type EventsFromApp = {
    /** Instructs the iframe to display the connection modal. */
    "request-display": "login-modal"

    /** Informs the iframe that the user has connected/disconnected to/from an injected wallet. */
    "injected-wallet:connect": { rdns: string; address: `0x${string}` } | { rdns?: undefined; address?: undefined }

    /**
     * Instructs the iframe to mirror a permission that has been granted to the user by the
     * injected wallet.
     *
     * This is required because we depend on permissions to establish that the user is connected
     * to the wallet.
     */
    "injected-wallet:mirror-permissions": {
        request: EIP119PermissionsRequest
        response: unknown
    }
}
type _assert1 = AssertAssignableTo<EventsFromApp, EventSchema<EventsFromApp>>

/**
 * Events sent from the iframe to the app on the general message bus.
 */
export type EventsFromIframe = {
    /** Informs the SDK that the iframe has loaded and initialized. */
    "iframe-init": boolean

    /** Instructs the SDK to resize the resize the iframe to toggle the wallet modal. */
    "modal-toggle": boolean

    /** Informs the app that the user information has changed (including connect & disconnect). */
    "auth-changed": HappyUser | undefined

    /** Informs the SDK of the current social authentication state of the user. */
    "auth-state": AuthState

    /** Instructs the SDK to connect/disconnect to/from an injected wallet with given RDNS. */
    "injected-wallet:requestConnect": WalletRDNS
}
type _assert2 = AssertAssignableTo<EventsFromIframe, EventSchema<EventsFromIframe>>
