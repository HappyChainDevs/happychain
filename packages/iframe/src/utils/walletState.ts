import { AuthState, Msgs } from "@happychain/sdk-shared"
import { appMessageBus } from "#src/services/eventBus.ts"
import { getAuthState } from "#src/state/authState.ts"

/** Hardcoded value in firebase signInWithPopup ` _Timeout.AUTH_EVENT` */
const FIREBASE_MAGIC_TIMEOUT_MS = 8000
/** Desired timeout fix */
const FIREBASE_MAGIC_TIMEOUT_MS_FIX = 500

const originalSetTimeout = window.setTimeout

const patchedSetTimeout: typeof setTimeout = ((...params: Parameters<typeof setTimeout>) => {
    if (getAuthState() === AuthState.Connected) return originalSetTimeout(...params)

    const [fn, _delay, ...args] = params
    // Check if the delay matches Firebase's _Timeout.AUTH_EVENT

    const delay = _delay === FIREBASE_MAGIC_TIMEOUT_MS ? FIREBASE_MAGIC_TIMEOUT_MS_FIX : _delay

    return originalSetTimeout(fn, delay, ...args)
}) as typeof setTimeout

function patchTimeoutOn() {
    window.setTimeout = patchedSetTimeout
}

function patchTimeoutOff() {
    window.setTimeout = originalSetTimeout
}

export function signalOpen() {
    patchTimeoutOn()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: true })
}
export function signalClosed() {
    patchTimeoutOff()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
