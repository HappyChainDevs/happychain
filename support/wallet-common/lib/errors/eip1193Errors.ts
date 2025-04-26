// === EIP1193 ERROR CODES & DESCRIPTION ===============================================================================

import { HappyRpcError } from "./HappyRpcError"

/**
 * Standard Provider Error Codes ({@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors})
 *
 * Non-Standard error codes from {@link https://github.com/wevm/viem/blob/9dc0724ae09827bd12c612df1d73b50fadf3c982/src/errors/rpc.ts#L64}
 *
 * See also {@link EIP1474ErrorCodes}
 */
export enum EIP1193ErrorCodes {
    UserRejectedRequest = 4001, // standard
    Unauthorized = 4100, // standard
    UnsupportedMethod = 4200, // standard
    Disconnected = 4900, // standard
    ChainDisconnected = 4901, // standard
    SwitchChainError = 4902, // non-standard, used by Viem & wallet
}

export function isEIP1193ErrorCode(code: number): code is EIP1193ErrorCodes {
    return Object.values(EIP1193ErrorCodes).includes(code)
}

export const eip1193ErrorDescriptions = {
    [EIP1193ErrorCodes.UserRejectedRequest]: "The user rejected the request",
    [EIP1193ErrorCodes.Unauthorized]: "The requested method and/or account has not been authorized by the user",
    [EIP1193ErrorCodes.UnsupportedMethod]: "The provider does not support the requested method",
    [EIP1193ErrorCodes.Disconnected]: "The provider is disconnected from all chains",
    [EIP1193ErrorCodes.ChainDisconnected]: "The provider is not connected to the requested chain",
    [EIP1193ErrorCodes.SwitchChainError]: "An error occurred when attempting to switch chain",
}

// === EIP1193 ERROR CLASSES ===========================================================================================

/**
 * Generic provider RPC error, parent class of specialized classes (one per error code).
 *
 * The subclasses exist as a convenience when throwing, but should
 * be relied on for detection — use the {@link code} field instead.
 */
export class ProviderRpcError extends HappyRpcError {
    constructor(code: EIP1193ErrorCodes, details?: string, ctxMessages?: string[]) {
        super(code, eip1193ErrorDescriptions[code], details, ctxMessages)
    }
}

/** Provider RPC error code 4001 */
export class EIP1193UserRejectedRequestError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.UserRejectedRequest, details)
    }
}

/** Provider RPC error code 4100 */
export class EIP1193UnauthorizedError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.Unauthorized, details)
    }
}

/** Provider RPC error code 4200 */
export class EIP1193UnsupportedMethodError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.UnsupportedMethod, details)
    }
}

/** Provider RPC error code 4900 */
export class EIP1193DisconnectedError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.Disconnected, details)
    }
}

/** Provider RPC error code 4901 */
export class EIP1193ChainDisconnectedError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.ChainDisconnected, details)
    }
}

/** Provider RPC error code 4902 */
export class EIP1193SwitchChainError extends ProviderRpcError {
    constructor(details?: string) {
        super(EIP1193ErrorCodes.SwitchChainError, details)
    }
}
