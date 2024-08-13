import type { HappyUser } from './happyUser'

export interface HappyEvents {
    // modal states
    'modal-toggle': boolean

    // user auth
    'auth-changed': HappyUser | null

    'wallet-connect:request': string
    'wallet-connect:response': { user: HappyUser | null }

    'wallet-disconnect:request': null
}
