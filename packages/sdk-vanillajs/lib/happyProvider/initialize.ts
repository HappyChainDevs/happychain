import type { EIP1193ProxiedEvents, HappyEvents, HappyUser } from "@happychain/sdk-shared"
import { EventBus, EventBusChannel, config, createUUID } from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"
import { HappyProvider } from "./happyProvider"
import { registerListeners } from "./listeners"

/**
 * Unique Window UUID
 *
 * @internal
 */
export const windowId = createUUID()

const dappMessageBus = new EventBus<HappyEvents>({
    mode: EventBusChannel.DappPort,
    scope: "happy-chain-dapp-bus",
})

export const { onUserUpdate, onModalUpdate, onAuthStateUpdate } = registerListeners(dappMessageBus)

let user: HappyUser | undefined

onUserUpdate((_user?: HappyUser) => {
    user = _user
})

/**
 * Current Active HappyUser
 *
 * {@link HappyUser}
 * @returns currently connected HappyUser, or undefined
 *
 * @example
 * ```ts twoslash
 * import { getCurrentUser } from '@happychain/js'
 * // ---cut---
 * const user = getCurrentUser()
 * ```
 */
export const getCurrentUser = () => user

/**
 * `happyProvider` is an {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP1193 Ethereum Provider}
 * and is an initialized instance of {@link HappyProvider}
 */
export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    windowId: windowId,

    providerBus: new EventBus<EIP1193ProxiedEvents>({
        mode: EventBusChannel.DappPort,
        scope: "happy-chain-eip1193-provider",
    }),

    dappBus: dappMessageBus,
}) as HappyProvider & EIP1193Provider
