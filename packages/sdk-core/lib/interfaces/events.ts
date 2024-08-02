import type { HappyUser } from './happyUser'

export interface HappyEvents {
    // modal states
    'modal-toggle': boolean

    // user auth
    'auth-changed': HappyUser | null
}
