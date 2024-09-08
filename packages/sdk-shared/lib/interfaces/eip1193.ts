import type { EIP1193EventMap, EIP1193Parameters, EIP1474Methods } from "viem"

// === EIP1193 METHODS =============================================================================

/**
 * Union type of all EIP1193 request methods names.
 */
export type EIP1193RequestMethods = EIP1474Methods[number]["Method"]

/**
 * Union type of all EIP1193 request types.
 */
export type EIP1193RequestParameters<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    EIP1193Parameters<EIP1474Methods>,
    { method: TString }
>

/**
 * Union type of all EIP1193 request results.
 */
export type EIP1193RequestResult<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    EIP1474Methods[number],
    { Method: TString }
>["ReturnType"]

/**
 * Union type of all EIP1193 event names.
 */
export type EIP1193EventName = keyof EIP1193EventMap

// === PERMISSIONS METHODS =========================================================================

const eip1193PermissionsMethods = [
    "eth_accounts",
    "eth_requestAccounts",
    "wallet_requestPermissions",
    "wallet_revokePermissions",
] // TODO as const should be here, but does not work with Vite

type EIP1193PermissionsMethod = (typeof eip1193PermissionsMethods)[number]

/**
 * Union type of all EIP1193 request types that request permissions.
 */
export type EIP1193PermissionsRequest = Extract<EIP1193RequestParameters, { method: EIP1193PermissionsMethod }>

/**
 * Checks if the EIP-1193 request is one that requests permissions.
 */
export function isPermissionsRequest(args: { method: string; params?: unknown }): args is EIP1193PermissionsRequest {
    return eip1193PermissionsMethods.includes(args.method as EIP1193PermissionsMethod)
}
