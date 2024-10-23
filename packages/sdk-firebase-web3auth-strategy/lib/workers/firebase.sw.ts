import type { HappyUser } from "@happychain/sdk-shared"
import { FirebaseAuthState } from "./firebaseAuthState"

// === SHARED USER STATE ===========================================================================

let user: HappyUser | undefined

export async function getUser() {
    return user
}
export async function setUser(_user?: HappyUser) {
    user = _user
}

// === SHARED AUTH STATE ===========================================================================

let state = FirebaseAuthState.Disconnected

export function getState() {
    return state
}
export async function setState(_state: FirebaseAuthState) {
    state = _state
}
