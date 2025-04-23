/**
 * Standard Provider Error Codes {@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors}
 *
 * Non-Standard error codes from {@link https://github.com/wevm/viem/blob/9dc0724ae09827bd12c612df1d73b50fadf3c982/src/errors/rpc.ts#L64}
 *
 * See also {@link EIP474ErrorCodes}
 *
 * -1 for unknown
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
