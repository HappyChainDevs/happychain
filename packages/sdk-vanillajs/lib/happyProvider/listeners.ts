import type { EventBus, HappyEvents, HappyUser } from '@happychain/sdk-shared'

export function registerListeners(messageBus: EventBus<HappyEvents>) {
    const onUserUpdateCallbacks = new Set<(user?: HappyUser) => void>()
    const onModalUpdateCallbacks = new Set<(isOpen: boolean) => void>()

    messageBus.on('auth-changed', (user) => {
        for (const call of onUserUpdateCallbacks) {
            call(user)
        }
    })
    messageBus.on('modal-toggle', (isOpen) => {
        for (const call of onModalUpdateCallbacks) {
            call(isOpen)
        }
    })

    const onUserUpdate = (callback: (user?: HappyUser) => void) => {
        onUserUpdateCallbacks.add(callback)
        return () => {
            onUserUpdateCallbacks.delete(callback)
        }
    }
    const onModalUpdate = (callback: (isOpen: boolean) => void) => {
        onModalUpdateCallbacks.add(callback)
        return () => {
            onModalUpdateCallbacks.delete(callback)
        }
    }
    return { onUserUpdate, onModalUpdate }
}
