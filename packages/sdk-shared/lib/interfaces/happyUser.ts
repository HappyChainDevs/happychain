export type HappyUser = {
    uid: string

    /**
     * Social
     */
    email: string
    name: string
    avatar: string

    /**
     * Connection Details
     */
    /** Connection Provider (rabby, metamask, google) */
    provider: string
    /** Connected Wallet Type */
    type: WalletType

    /**
     * On-Chain
     */
    /** Active Address's ENS */
    ens: string

    /** Currently active address */
    controllingAddress: `0x${string}`
    /** Associated smart account address */
    address: `0x${string}`
    /** All owned addresses */
    addresses: `0x${string}`[]
}

export enum WalletType {
    Social = "social",
    Injected = "injected",
}

export enum AuthState {
    Disconnected = "unauthenticated",
    Initializing = "initializing",
    Connected = "authenticated",
}
