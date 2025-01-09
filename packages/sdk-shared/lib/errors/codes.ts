export enum EIP1193ErrorCodes {
    UserRejectedRequest = 4001,
    Unauthorized = 4100,
    UnsupportedMethod = 4200,
    Disconnected = 4900,
    ChainDisconnected = 4901,
    SwitchChainError = 4902, // non-standard, supported by viem
    Unknown = -1,
}
