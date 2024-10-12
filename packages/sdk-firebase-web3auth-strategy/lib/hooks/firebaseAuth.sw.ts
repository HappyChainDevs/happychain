import type { HappyUser } from "@happychain/sdk-shared"

let user: HappyUser | undefined

export function getUser() {
    return user
}
export function setUser(_user?: HappyUser) {
    console.log("setting user", _user)
    user = _user
}

enum AuthStates {
    Disconnected = "disconnected",
    Disconnecting = "disconnecting",
    Connected = "connected",
    Connecting = "connecting",
    Reconnecting = "re-connecting",
}

let state = AuthStates.Disconnected
export function getState() {
    return state
}
export function setState(_state: AuthStates) {
    console.log("setting state", _state)
    state = _state
}
