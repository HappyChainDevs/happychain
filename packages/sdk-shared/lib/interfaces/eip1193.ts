import type { HappyMethodNames } from "@happychain/common"
import type { Abi, Address, EIP1193EventMap, EIP1193Parameters, EIP1474Methods } from "viem"
import type { HappyUser } from "./happyUser"

export type RecordAbiPayload = {
    address: Address
    abi: Abi
}

// === HAPPY METHODS =============================================================================
export type HappyMethods = [
    {
        Method: HappyMethodNames.HAPPY_USER_RPC_METHOD
        Parameters?: undefined
        ReturnType: HappyUser | undefined
    },
    {
        Method: typeof HappyMethodNames.WALLET_USE_ABI_RPC_METHOD
        Parameters: RecordAbiPayload
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
