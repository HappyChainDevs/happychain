import type { HappyUser } from './happyUser'

// When RDNS is undefined a disconnect occurs, when its a string
// an EIP-6963 lookup occurs for this wallet to connect on dapp side
type WalletRDNS = string | undefined

export interface HappyEvents {
    // modal states
    'modal-toggle': boolean

    // user auth
    'auth-changed': HappyUser | undefined

    // iframe requests a connection to a specific injected wallet
    // dapp attempts to connect with wallet who's rdns matches
    'injected-wallet:request': WalletRDNS

    // if user is defined, dapp connects to injected wallet, and returns user details to iframe
    // if user is undefined, dapp disconnects from injected wallet
    'injected-wallet:response': { user?: HappyUser }
}
