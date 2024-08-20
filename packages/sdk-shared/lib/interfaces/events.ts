import type { HappyUser } from './happyUser'

/**
 * When RDNS is undefined a disconnect occurs, when its a string
 * an EIP-6963 lookup occurs for this wallet to connect on dapp side
 */
type WalletRDNS = string | undefined

export interface HappyEvents {
    // modal states
    'modal-toggle': boolean

    // user auth
    'auth-changed': HappyUser | undefined

    /**
     * Sent by the iframe to request a connection or disconnection with an injected wallet.
     * Received by the dapp, which attempts to connect with the wallet whose rdns matches.
     */
    'injected-wallet:request': WalletRDNS

    /**
     * Sent by the dapp in response to `injected-wallet:request` with the user details obtained from
     * connecting to the requested injected wallet. If the connection attempt failed, the user will
     * be undefined.
     *
     * Alternatively sent by the dapp as a response to other dapp side events such as
     * when the injected wallet disconnect or changes account and the iframe needs to be updated
     */
    'injected-wallet:response': { user?: HappyUser }
}
