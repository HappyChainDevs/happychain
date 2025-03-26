export enum HappyMethodNames {
    USER = "happy_user",
    LOAD_ABI = "happy_loadAbi",
    REQUEST_SESSION_KEY = "happy_requestSessionKey",
}

export enum PermissionNames {
    SESSION_KEY = "happy_sessionKey",
}

export enum TransactionType {
    /**
     * Legacy tx include both pre- and post-EIP155 (replay protection) transactions. These are indistinguishable, they
     * only vary in how they generated their signatures (post-EIP-155 signs a hash that also encompasses the chain ID).
     *
     * This is the only transaction type that doesn't really have a type encoded in the tx itself (so the number
     * 0x0 here is arbitrary), that concepts comes from "types transaction envelopes introduced in EIP-2718.
     */
    Legacy = "0x0",
    /**
     * Defined in EIP2930, but few people know that number, hence "access list".
     */
    AccessList = "0x1",
    EIP1559 = "0x2",
    EIP4844 = "0x3",
    EIP7702 = "0x4",
}
