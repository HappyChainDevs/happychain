import { hasKey } from "@happy.tech/common"

// === EIP1193 ERROR CODES =============================================================================================

/**
 * Standard Provider Error Codes ({@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors})
 *
 * Non-Standard error codes from {@link https://github.com/wevm/viem/blob/9dc0724ae09827bd12c612df1d73b50fadf3c982/src/errors/rpc.ts#L64},
 * -1 for unknown errors.
 *
 * See also {@link EIP474ErrorCodes}
 */
export enum EIP1193ErrorCodes {
    /** User Rejected Request, standard EIP1193 error */
    UserRejectedRequest = 4001,
    /** Unauthorized, standard EIP1193 error */
    Unauthorized = 4100,
    /** Unsupported Method, standard EIP1193 error */
    UnsupportedMethod = 4200,
    /** Disconnected, standard EIP1193 error */
    Disconnected = 4900,
    /** Chain Disconnected, standard EIP1193 error */
    ChainDisconnected = 4901,
    /** Chain Not Recognized, non-standard EIP1193-like error, supported by viem and others */
    SwitchChainError = 4902,
    /** Invalid Method Parameters, standard EIP1474 error */
    InvalidMethodParameters = -32602,
    /** Unknown */
    Unknown = -1,
}

// === EIP1193 ERROR OBJECT ============================================================================================

/**
 * Error Object is used to transmit error messages
 * across MessageChannel and BroadcastChannels.
 * This requires the data to be JSON serializable
 * so we can't send the raw Error class
 */
export type EIP1193ErrorObject = {
    code: EIP1193ErrorCodes
    message: string
    data?: unknown
}

// === EIP1193 ERROR CLASSES ===========================================================================================

/** Generic provider RPC error, parent class of specialized classes (one per error code). */
export class ProviderRpcError extends Error {
    code: EIP1193ErrorCodes
    label: string
    data?: unknown
    constructor(code: EIP1193ErrorCodes, err: EIP1193ErrorObject | string) {
        super(hasKey(err, "message") ? err.message : err)
        this.code = code
        this.label = EIP1193ErrorCodes[code]
        this.data = hasKey(err, "data") ? err.data : err
    }
}

/** Provider RPC error code 4001 */
export class EIP1193UserRejectedRequestError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "User Rejected Request") {
        super(EIP1193ErrorCodes.UserRejectedRequest, err)
    }
}

/** Provider RPC error code 4100 */
export class EIP1193UnauthorizedError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "Unauthorized") {
        super(EIP1193ErrorCodes.Unauthorized, err)
    }
}

/** Provider RPC error code 4200 */
export class EIP1193UnsupportedMethodError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "Unsupported Method") {
        super(EIP1193ErrorCodes.UnsupportedMethod, err)
    }
}

/** Provider RPC error code 4900 */
export class EIP1193DisconnectedError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "Disconnected") {
        super(EIP1193ErrorCodes.Disconnected, err)
    }
}

/** Provider RPC error code 4901 */
export class EIP1193ChainDisconnectedError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "Chain Disconnected") {
        super(EIP1193ErrorCodes.ChainDisconnected, err)
    }
}

/** Provider RPC error code 4902 */
export class EIP1193ChainNotRecognizedError extends ProviderRpcError {
    constructor(err: EIP1193ErrorObject | string = "Chain Not Recognized") {
        super(EIP1193ErrorCodes.SwitchChainError, err)
    }
}
