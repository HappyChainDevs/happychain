import { AuthState, Msgs } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/vanilla"
import { http, createPublicClient } from "viem"
import { mainnet } from "viem/chains"
import { appMessageBus } from "../services/eventBus"
import { hasPermission } from "../services/permissions/hasPermission"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

const store = getDefaultStore()

/**
 * Runs once at startup
 *
 * transmits current auth state to dapp (likely disconnected, or connecting)
 *
 * @emits auth-state
 */
void appMessageBus.emit(Msgs.AuthStateChanged, store.get(authStateAtom))

/**
 * emits the current auth state to dApp
 * - if the auth state is connected and dApp has permissions,
 *   the user will also be emitted
 * - if the auth state is disconnected then the user will be cleared
 *
 * @listens authStateAtom
 *
 * @emits auth-state
 * @emits auth-changed (optional)
 * @emits provider-event (optional)
 */
store.sub(authStateAtom, () => {
    const authState = store.get(authStateAtom)
    void appMessageBus.emit(Msgs.AuthStateChanged, authState)

    if (AuthState.Connecting === authState) {
        // no user updates in this state
        return
    }

    const permitted = hasPermission({ eth_accounts: {} })
    const user = store.get(userAtom)
    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        emitUserUpdate(user)
    }
})

/**
 * transmit user updates to the front end (if permitted)
 *
 * @listens userAtom
 *
 * @emits auth-changed (optional)
 * @emits provider-event (optional)
 */
store.sub(userAtom, () => {
    const user = store.get(userAtom)
    const permitted = hasPermission({ eth_accounts: {} })

    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        emitUserUpdate(user)
    }
})

/**
 * async load ENS name if available when user updates
 *
 * This works, but is missing ensResolver.
 * could force lookup on ETH mainnet regardless of connected chain
 * https://github.com/HappyChainDevs/happychain/issues/40
 *
 * @listens userAtom
 */
const mainnetClient = createPublicClient({ chain: mainnet, transport: http() })
store.sub(userAtom, async () => {
    const user = store.get(userAtom)
    // don't update if ens already has been found
    if (!user || user.ens) return

    const ensName = await mainnetClient.getEnsName({ address: user.address })

    if (ensName) {
        user.ens = ensName
        store.set(userAtom, user)
    }
})
