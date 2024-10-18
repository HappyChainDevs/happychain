import type { Msgs, MsgsFromApp, MsgsFromIframe } from "./events"

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
    connect: (request: MsgsFromApp[Msgs.ConnectRequest]) => Promise<MsgsFromIframe[Msgs.ConnectResponse]>
    disconnect: () => Promise<void>
}
