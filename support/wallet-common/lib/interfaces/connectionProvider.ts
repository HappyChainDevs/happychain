import type { Msgs, MsgsFromApp, MsgsFromWallet } from "./events"

/**
 * Interface for a connectable provider (for injected or social wallets).
 *
 * This is shared between the iframe and the social wallet strategies.
 */
export interface ConnectionProvider {
    id: string
    name: string
    icon: string
    type: string
    connect: (
        request: MsgsFromApp[Msgs.ConnectRequest],
        signal: AbortSignal,
    ) => Promise<MsgsFromWallet[Msgs.ConnectResponse]>
    disconnect: () => Promise<void>
}
