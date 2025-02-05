/**
 * Standard Error Codes {@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors}
 *
 * Non-Standard error codes from {@link https://github.com/wevm/viem/blob/9dc0724ae09827bd12c612df1d73b50fadf3c982/src/errors/rpc.ts#L64}
 *
 * -1 for unknown
 */
export enum EIP1193ErrorCodes {
    /** User Rejected Request */
    UserRejectedRequest = 4001,
    /** Unauthorized */
    Unauthorized = 4100,
    /** Unsupported Method */
    UnsupportedMethod = 4200,
    /** Disconnected */
    Disconnected = 4900,
    /** Chain Disconnected */
    ChainDisconnected = 4901,
    /** Chain Not Recognized - non-standard, supported by viem and others */
    SwitchChainError = 4902,
    /** Unknown */
    Unknown = -1,
}
