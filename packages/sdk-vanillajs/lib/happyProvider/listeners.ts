import type { EventBus, HappyEvents, HappyUser } from "@happychain/sdk-shared"

/**
 * Callback which is called on page load, and again on every user update
 *
 * @param {HappyUser | undefined} user
 */
export type UserUpdateCallback = (user?: HappyUser) => void

/** @internal */
export type ModalUpdateCallback = (isOpen: boolean) => void

/**
 * Cleanup function which can be used to unsubscribe
 * from the event which it was returned from
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

export function registerListeners(messageBus: EventBus<HappyEvents>) {
    const onUserUpdateCallbacks = new Set<(user?: HappyUser) => void>()
    const onModalUpdateCallbacks = new Set<(isOpen: boolean) => void>()

    messageBus.on("auth-changed", (user) => {
        for (const call of onUserUpdateCallbacks) {
            call(user)
        }
    })
    messageBus.on("modal-toggle", (isOpen) => {
        for (const call of onModalUpdateCallbacks) {
            call(isOpen)
        }
    })

    /**
     * Register a new callback which will be triggered
     * on page load and with every user update
     *
     * @example
     * ```ts twoslash
     * import { onUserUpdate } from '@happychain/js'
     *
     * // [!include ~/snippets/listeners.ts:onUserUpdate]
     *```
     *
     * @param UserUpdateCallback
     * @returns Unsubscribe function
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
     * @param ModalUpdateCallback
     * @returns Unsubscribe function
     */
    const onModalUpdate = (callback: ModalUpdateCallback): ListenerUnsubscribeFn => {
        onModalUpdateCallbacks.add(callback)
        return () => {
            onModalUpdateCallbacks.delete(callback)
        }
    }

    return {
        onUserUpdate,
        onModalUpdate,
    }
}
