import type { HappyUser } from "./happyUser"

export interface HappyEvents {
    // modal states
    "modal-toggle": boolean

    // user auth
    "auth-changed": HappyUser | undefined

    "wallet-connect:request": string
    "wallet-connect:response": { user?: HappyUser }

    "wallet-disconnect:request": undefined
}
