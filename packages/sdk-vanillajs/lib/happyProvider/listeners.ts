import type { EventBus, HappyEvents, HappyUser } from "@happychain/sdk-shared"

export type UserUpdateCallback = (user?: HappyUser) => void
export type ModalUpdateCallback = (isOpen: boolean) => void

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
     * @example
     * ```ts twoslash
     * import { onUserUpdate } from '@happychain/js'
     *
     * // [!include ~/snippets/listeners.ts:onUserUpdate]
     *```
     *
     * @param UserUpdateCallback
     * @returns unsubscribe function
     */
    const onUserUpdate = (callback: UserUpdateCallback) => {
        onUserUpdateCallbacks.add(callback)
        return () => {
            onUserUpdateCallbacks.delete(callback)
        }
    }

    const onModalUpdate = (callback: ModalUpdateCallback) => {
        onModalUpdateCallbacks.add(callback)
        return () => {
            onModalUpdateCallbacks.delete(callback)
        }
    }
    return { onUserUpdate, onModalUpdate }
}
