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
    type: "social" | "injected"

    /**
     * On-Chain
     */
    /** Active Address's ENS */
    ens: string

    /** Currently active address */
    address: `0x${string}`
    /** All owned addresses */
    addresses: `0x${string}`[]
}

export enum AuthState {
    Unauthenticated = "unauthenticated",
    Loading = "loading",
    Authenticated = "authenticated",
}
