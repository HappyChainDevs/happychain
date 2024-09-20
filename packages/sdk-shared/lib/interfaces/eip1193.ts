import type { TupleUnion } from "@happychain/common"
import type { EIP1193EventMap, EIP1193Parameters, EIP1474Methods, PublicRpcSchema, WalletRpcSchema } from "viem"

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

type EIP1193PermissionsMethod =
    | "eth_accounts"
    | "eth_requestAccounts"
    | "wallet_requestPermissions"
    | "wallet_revokePermissions"

type EIP1193PermissionsMethodArray = TupleUnion<EIP1193PermissionsMethod>

const eip1193PermissionsMethods: string[] = [
    // https://ethereum.org/en/developers/docs/apis/json-rpc/
    "eth_accounts",
    // https://eips.ethereum.org/EIPS/eip-1102
    "eth_requestAccounts",
    // https://eips.ethereum.org/EIPS/eip-2255
    "wallet_requestPermissions",
    // https://docs.metamask.io/wallet/reference/wallet_revokepermissions/
    "wallet_revokePermissions",
] satisfies EIP1193PermissionsMethodArray

// Note: it would be cleaner to use `as const` on the array then use it to define
// `EIP1193PermissionsMethod`. Unfortunately this breaks Microsoft's API extractor and therefore
// vite-plugin-dts.

/**
 * Union type of all EIP1193 request types that request permissions.
 */
export type EIP1193PermissionsRequest = Extract<EIP1193RequestParameters, { method: EIP1193PermissionsMethod }>

/**
 * Checks if the EIP-1193 request is one that requests permissions.
 */
export function isPermissionsRequest(args: { method: string; params?: unknown }): args is EIP1193PermissionsRequest {
    return eip1193PermissionsMethods.includes(args.method)
}
