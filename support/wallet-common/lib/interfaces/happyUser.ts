export type HappyUser = {
    // CONNECTION

    /** Connection provider ("rabby", "metamask", "google", ...) */
    provider: string

    /** Type of the controlling EOA (Social, Injected) — constants available in {@link WalletType} */
    type: "social" | "injected"

    // USER DETAILS

    /** Unique identifier (Firebase user ID) */
    uid: string

    /** Email (if available, or empty) */
    email: string

    /** Display name (abbreviated address for Injected) */
    name: string

    /** Avatar URL (if available, or placeholder avatar) */
    avatar: string

    // ONCHAIN

    /** Happy account address */
    address: `0x${string}`

    /** EOA controlling the account */
    controllingAddress: `0x${string}`

    /** Active Address's ENS (if available, or empty) */
    ens: string
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
