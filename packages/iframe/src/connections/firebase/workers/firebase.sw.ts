import type { HappyUser } from "@happychain/sdk-shared"
import { FirebaseAuthState } from "./firebaseAuthState"

// === SHARED USER STATE ===========================================================================

let user: HappyUser | undefined

export async function getFirebaseSharedUser() {
    return user
}
export async function setFirebaseSharedUser(_user?: HappyUser) {
    user = _user
}

// === SHARED AUTH STATE ===========================================================================

let state = FirebaseAuthState.Disconnected

export function getFirebaseAuthState() {
    return state
}
export async function setFirebaseAuthState(_state: FirebaseAuthState) {
    state = _state
}
