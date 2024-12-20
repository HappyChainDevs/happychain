import { AuthState, Msgs } from "@happychain/sdk-shared"
import { appMessageBus } from "#src/services/eventBus.ts"
import { getAuthState } from "#src/state/authState.ts"

/**
 * Wallet State (open vs closed) is managed entirely through the WalletVisibility event here. This
 * provides a flexible way to open/close the wallet component from within the happy provider, inside
 * the wallet web-component on the app side, or from within the iframe.
 *
 *
 */

export function signalOpen() {
    patchTimeoutOn()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: true })
}
export function signalClosed() {
    patchTimeoutOff()
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}

/**
 * Below is a work around for an error in Firebase signInWithPopup. After a user selects a firebase
 * login method such as Google, and the OAuth popup opens, if they then simply close the popup
 * instead of signing in, the Firebase SDK internally has a hardcoded 8 second timeout before
 * recognizing the popup was closed. This leads to a unpleasant experience. The work around below
 * is a hack so that when the wallet opens and the user is not yet connected, we patch setTimeout
 * globally so that if the timeout is exactly 8 seconds, we will substitute 0.5 seconds instead.
 * This leads to a much nicer user experience, however it is not an ideal solution.
 *
 * Issue: https://github.com/firebase/firebase-js-sdk/issues/8061
 * "Fix": https://github.com/firebase/firebase-js-sdk/issues/8061#issuecomment-2047370693
 */

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
