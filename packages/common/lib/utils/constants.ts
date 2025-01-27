export enum HappyMethodNames {
    USER = "happy_user",
    USE_ABI = "happy_useAbi",
    REQUEST_SESSION_KEY = "happy_requestSessionKey",
}

export enum PermissionNames {
    SESSION_KEY = "happy_sessionKey",
}

export enum TransactionType {
    Legacy = "0x0",
    EIP1559OptionalAccessList = "0x1",
    EIP1559 = "0x2",
    EIP4844 = "0x3",
    EIP7702 = "0x4",
}
