import type { WALLET_USE_ABI_RPC_METHOD } from "@happychain/common"
import type { Abi, Address, EIP1193EventMap, EIP1193Parameters, EIP1474Methods } from "viem"
import type { HappyUser } from "./happyUser"

export type RecordAbiPayload = {
    address: Address
    abi: Abi
}

// === HAPPY METHODS =============================================================================
export type HappyMethods = [
    {
        Method: "happy_user"
        Parameters?: undefined
        ReturnType: HappyUser | undefined
    },
    {
        Method: typeof WALLET_USE_ABI_RPC_METHOD
        Parameters?: RecordAbiPayload
        ReturnType: undefined
    },
]

// === RPC METHODS =============================================================================

export type RPCMethods = [...HappyMethods, ...EIP1474Methods]

// === EIP1193 METHODS =============================================================================

/**
 * Union type of all EIP1193 request methods names.
 */
export type EIP1193RequestMethods = RPCMethods[number]["Method"]

/**
 * Union type of all EIP1193 request types.
 */
export type EIP1193RequestParameters<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    EIP1193Parameters<RPCMethods>,
    { method: TString }
>

/**
 * Union type of all EIP1193 request results.
 */
export type EIP1193RequestResult<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    RPCMethods[number],
    { Method: TString }
>["ReturnType"]

/**
 * Union type of all EIP1193 event names.
 */
export type EIP1193EventName = keyof EIP1193EventMap

// === PERMISSIONS METHODS =========================================================================

const eip1193PermissionsMethods = [
    // https://ethereum.org/en/developers/docs/apis/json-rpc/
    "eth_accounts",
    // https://eips.ethereum.org/EIPS/eip-1102
    "eth_requestAccounts",
    // https://eips.ethereum.org/EIPS/eip-2255
    "wallet_requestPermissions",
    // https://docs.metamask.io/wallet/reference/wallet_revokepermissions/
    "wallet_revokePermissions",
] as const

const eip1193PermissionsMethodsSet = new Set<string>(eip1193PermissionsMethods)

/**
 * Union type of all EIP1193 request types that request permissions.
 */
export type EIP1193PermissionsRequest = Extract<
    EIP1193RequestParameters,
    { method: (typeof eip1193PermissionsMethods)[number] }
>

/**
 * Checks if the EIP-1193 request is one that requests permissions.
 */
export function isPermissionsRequest(args: { method: string; params?: unknown }): args is EIP1193PermissionsRequest {
    return eip1193PermissionsMethodsSet.has(args.method)
}
