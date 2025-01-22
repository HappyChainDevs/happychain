import { getUser } from "@happy.tech/iframe/src/state/user"
import {
    type AuthState,
    type EventBus,
    type HappyUser,
    Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
} from "@happy.tech/wallet-common"

/**
 * Callback which is called on page load, and again on every user update.
 *
 * @param {HappyUser | undefined} user
 */
export type UserUpdateCallback = (user?: HappyUser) => void

export type WalletVisibilityCallback = (state: { isOpen: boolean }) => void

export type AuthStateUpdateCallback = (state: AuthState) => void

export type IframeInitCallback = (isInit: boolean) => void

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

export function registerListeners(messageBus: EventBus<MsgsFromIframe, MsgsFromApp>) {
    const onUserUpdateCallbacks = new Set<UserUpdateCallback>()
    const onWalletVisibilityCallbacks = new Set<WalletVisibilityCallback>()
    const onIframeInitCallbacks = new Set<IframeInitCallback>()
    const onAuthStateUpdateCallbacks = new Set<AuthStateUpdateCallback>()

    messageBus.on(Msgs.UserChanged, (user) => {
        for (const call of onUserUpdateCallbacks) {
            call(user)
        }
    })

    messageBus.on(Msgs.AuthStateChanged, (state) => {
        for (const call of onAuthStateUpdateCallbacks) {
            call(state)
        }
    })

    messageBus.on(Msgs.WalletVisibility, ({ isOpen }) => {
        for (const call of onWalletVisibilityCallbacks) {
            call({ isOpen })
        }
    })

    messageBus.on(Msgs.IframeInit, (isInit) => {
        for (const call of onIframeInitCallbacks) {
            call(isInit)
        }
    })

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
        const currentUser = getUser()
        if (currentUser) {
            void Promise.resolve().then(() => {
                callback(currentUser)
            })
        }
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
        onWalletVisibilityCallbacks.add(callback)
        return () => {
            onWalletVisibilityCallbacks.delete(callback)
        }
    }

    /**
     * Called when the iframe requests a resize
     *
     * @internal
     * @param callback
     * @returns Unsubscribe function
     */
    const onAuthStateUpdate = (callback: AuthStateUpdateCallback): ListenerUnsubscribeFn => {
        onAuthStateUpdateCallbacks.add(callback)
        return () => {
            onAuthStateUpdateCallbacks.delete(callback)
        }
    }

    /**
     * Called when the iframe finishes initializing and web3 connection is confirmed
     *
     * @internal
     * @param IframeInitCallback
     * @returns Unsubscribe function
     */
    const onIframeInit = (callback: IframeInitCallback): ListenerUnsubscribeFn => {
        onIframeInitCallbacks.add(callback)
        return () => {
            onIframeInitCallbacks.delete(callback)
        }
    }

    return {
        onUserUpdate,
        onWalletVisibilityUpdate,
        onAuthStateUpdate,
        onIframeInit,
    }
}
