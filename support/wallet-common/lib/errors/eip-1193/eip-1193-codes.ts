/**
 * @see {@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors|Provider Error Codes (EIP-1193)}
 */
export enum EIP1193ProviderErrorCodes {
    // EIP-1193 Error Codes
    UserRejectedRequest = 4001,
    Unauthorized = 4100,
    UnsupportedMethod = 4200,
    Disconnected = 4900,
    ChainDisconnected = 4901,
    SwitchChainError = 4902, // non-standard, supported by viem
    Unknown = -1,
}
