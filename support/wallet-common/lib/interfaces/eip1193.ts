import type { Address } from "@happy.tech/common"
import type { Abi, EIP1193EventMap, EIP1193Parameters, PublicRpcSchema, WalletRpcSchema } from "viem"
import type { HappyUser } from "./happyUser"

export enum HappyMethodNames {
    USER = "happy_user",
    LOAD_ABI = "happy_loadAbi",
    REQUEST_SESSION_KEY = "happy_requestSessionKey",
}

export type RecordAbiPayload = {
    address: Address
    abi: Abi
}

// === HAPPY METHODS =============================================================================
export type HappyMethods = [
    {
        Method: HappyMethodNames.USER
        Parameters?: undefined
        ReturnType: HappyUser | undefined
    },
    {
        Method: typeof HappyMethodNames.LOAD_ABI
        Parameters: RecordAbiPayload
        ReturnType: undefined
    },
    {
        Method: typeof HappyMethodNames.REQUEST_SESSION_KEY
        Parameters: [Address]
        ReturnType: undefined
    },
]

// === RPC METHODS =============================================================================

export type RPCMethods = [...HappyMethods, ...PublicRpcSchema, ...WalletRpcSchema]

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
