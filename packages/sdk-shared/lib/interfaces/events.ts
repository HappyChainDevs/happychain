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
 * Names of types of messages that can be sent on the general message bus.
 */
export enum Messages {
    // === EventsFromApp ===

    /** Instructs the iframe to display the connection modal. */
    RequestDisplay = "request-display",

    /** Informs the iframe that the user has connected/disconnected to/from an injected wallet. */
    InjectedWalletConnect = "injected-wallet:connect",

    /**
     * Instructs the iframe to mirror a permission that has been granted to the user by the
     * injected wallet.
     *
     * This is required because we depend on permissions to establish that the user is connected
     * to the wallet.
     */
    MirrorPermissions = "injected-wallet:mirror-permissions",

    // === EventsFromIframe ===

    /** Informs the SDK that the iframe has loaded and initialized. */
    IframeInit = "iframe-init",

    /** Instructs the SDK to resize the resize the iframe to toggle the wallet modal. */
    ModalToggle = "modal-toggle",

    /** Informs the app that the user information has changed (including connect & disconnect). */
    AuthChanged = "auth-changed",

    /** Informs the SDK of the current social authentication state of the user. */
    AuthState = "auth-state",

    /** Instructs the SDK to connect/disconnect to/from an injected wallet with given RDNS. */
    InjectedWalletRequestConnect = "injected-wallet:requestConnect",
}

/**
 * Events sent from the app to the iframe on the general message bus.
 */
export type EventsFromApp = {
    [Messages.RequestDisplay]: "login-modal"
    [Messages.InjectedWalletConnect]:
        | { rdns: string; address: `0x${string}` }
        | { rdns?: undefined; address?: undefined }
    [Messages.MirrorPermissions]: {
        request: EIP119PermissionsRequest
        response: unknown
    }
}
type _assert1 = AssertAssignableTo<EventsFromApp, EventSchema<EventsFromApp>>

/**
 * Events sent from the iframe to the app on the general message bus.
 */
export type EventsFromIframe = {
    [Messages.IframeInit]: boolean
    [Messages.ModalToggle]: boolean
    [Messages.AuthChanged]: HappyUser | undefined
    [Messages.AuthState]: AuthState
    [Messages.InjectedWalletRequestConnect]: WalletRDNS
}
type _assert2 = AssertAssignableTo<EventsFromIframe, EventSchema<EventsFromIframe>>
