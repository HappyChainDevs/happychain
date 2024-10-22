import type { HappyUser } from "@happychain/sdk-shared"
import { AuthStates } from "../constants/enums"

// === SHARED USER STATE ===========================================================================

let user: HappyUser | undefined

export async function getUser() {
    return user
}
export async function setUser(_user?: HappyUser) {
    user = _user
}

// === SHARED AUTH STATE ===========================================================================

let state = AuthStates.Disconnected

export function getState() {
    return state
}
export async function setState(_state: AuthStates) {
    state = _state
}
