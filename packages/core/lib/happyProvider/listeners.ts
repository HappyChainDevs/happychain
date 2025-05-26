import {
    type AuthState,
    type EventBus,
    type HappyUser,
    Msgs,
    type MsgsFromApp,
    type MsgsFromWallet,
    type OverlayErrorCode,
} from "@happy.tech/wallet-common"

/**
 * Callback which is called on page load, and again on every user update.
 *
 * @param {HappyUser | undefined} user
 */
export type UserUpdateCallback = (user?: HappyUser) => void

export type WalletVisibilityCallback = (state: { isOpen: boolean }) => void

export type AuthStateUpdateCallback = (state: AuthState) => void

export type DisplayOverlayErrorCallback = (state: OverlayErrorCode) => void

export type WalletInitCallback = (isInit: boolean) => void

/**
 * Cleanup function which can be used to unsubscribe from the event which it was returned from.
 *
 * @example
 * ```ts
 * useEffect({
 *   const unsubscribe = onUserUpdate(user => console.log({ user }))
 *   return () => unsubscribe()
 * }, [])
 * ```
 */
export type ListenerUnsubscribeFn = () => void

function executeCallbacks<T>(callbacks: Set<(_args: T) => void>, args: T) {
    for (const call of callbacks) {
        call(args)
    }
}

function createListener<T>(callbacks: Set<T>, callback: T): ListenerUnsubscribeFn {
    callbacks.add(callback)
    return () => {
        callbacks.delete(callback)
    }
}

export function registerListeners(messageBus: EventBus<MsgsFromWallet, MsgsFromApp>) {
    const onUserUpdateCallbacks = new Set<UserUpdateCallback>()
    const onWalletVisibilityCallbacks = new Set<WalletVisibilityCallback>()
    const onWalletInitCallbacks = new Set<WalletInitCallback>()
    const onAuthStateUpdateCallbacks = new Set<AuthStateUpdateCallback>()
    const onDisplayOverlayErrorCallbacks = new Set<DisplayOverlayErrorCallback>()

    messageBus.on(Msgs.UserChanged, (user) => executeCallbacks(onUserUpdateCallbacks, user))
    messageBus.on(Msgs.AuthStateChanged, (state) => executeCallbacks(onAuthStateUpdateCallbacks, state))
    messageBus.on(Msgs.WalletVisibility, (isOpen) => executeCallbacks(onWalletVisibilityCallbacks, isOpen))
    messageBus.on(Msgs.WalletInit, (isInit) => executeCallbacks(onWalletInitCallbacks, isInit))
    messageBus.on(Msgs.DisplayOverlayError, (errorCode) => executeCallbacks(onDisplayOverlayErrorCallbacks, errorCode))

    /**
     * Register a new callback which will be triggered
     * on page load and with every user update
     *
     * @example
     * ```ts twoslash
     * import { onUserUpdate } from '@happy.tech/core'
     *
     * // [!include ~/snippets/listeners.ts:onUserUpdate]
     *```
     *
     * @param callback
     */
    const onUserUpdate = (callback: UserUpdateCallback): ListenerUnsubscribeFn => {
        onUserUpdateCallbacks.add(callback)
        return () => {
            onUserUpdateCallbacks.delete(callback)
        }
    }

    /**
     * Called when the iframe requests a resize
     *
     * @internal
     * @param callback
     * @returns Unsubscribe function
     */
    const onWalletVisibilityUpdate = (callback: WalletVisibilityCallback): ListenerUnsubscribeFn => {
        return createListener(onWalletVisibilityCallbacks, callback)
    }

    /**
     * Called when the iframe requests a resize
     *
     * @internal
     * @param callback
     * @returns Unsubscribe function
     */
    const onAuthStateUpdate = (callback: AuthStateUpdateCallback): ListenerUnsubscribeFn => {
        return createListener(onAuthStateUpdateCallbacks, callback)
    }

    /**
     * Called when the wallet finishes initializing and a web3 connection is confirmed
     *
     * @internal
     * @param WalletInitCallback
     * @returns Unsubscribe function
     */
    const onWalletInit = (callback: WalletInitCallback): ListenerUnsubscribeFn => {
        return createListener(onWalletInitCallbacks, callback)
    }

    /**
     * Called when the wallet requires an urgent overlay to be displayed.
     *
     * @internal
     * @param DisplayOverlayErrorCallback
     * @returns Unsubscribe function
     */
    const onDisplayOverlayError = (callback: DisplayOverlayErrorCallback): ListenerUnsubscribeFn => {
        return createListener(onDisplayOverlayErrorCallbacks, callback)
    }

    return {
        onUserUpdate,
        onWalletVisibilityUpdate,
        onAuthStateUpdate,
        onWalletInit,
        onDisplayOverlayError,
    }
}
