import { AuthState, Msgs } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/vanilla"
import { http, createPublicClient } from "viem"
import { mainnet } from "viem/chains"
import { appMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

const store = getDefaultStore()
if (!store.get(userAtom)) {
    // if we aren't connected, announce immediately
    emitUserUpdate(store.get(userAtom))
}
/**
 * Runs once at startup to transmit the current auth state to the app (likely
 * {@link AuthState.Disconnected}, or {@link AuthState.Connecting}).
 *
 * @emits {@link Msgs.AuthStateChanged}
 */
void appMessageBus.emit(Msgs.AuthStateChanged, store.get(authStateAtom))

/**
 * Emits the current auth state to the app when it changes.
 *
 * - If the auth state is {@link AuthState.Connected} and app has permissions, the user will also be emitted.
 * - If the auth state is {@link AuthState.Disconnected} then the user will be cleared.
 *
 * @listens authStateAtom
 *
 * @emits {@link Msgs.AuthStateChanged}
 * @emits {@link Msgs.UserChanged} (optional)
 * @emits {@link Msgs.ProviderEvent} (optional)
 */
store.sub(authStateAtom, () => {
    const authState = store.get(authStateAtom)
    void appMessageBus.emit(Msgs.AuthStateChanged, authState)

    if (AuthState.Connecting === authState) {
        // no user updates in this state
        return
    }

    emitUserUpdate(store.get(userAtom))
})

/**
 * Emits user updates to the app (if permitted).
 *
 * @listens userAtom
 *
 * @emits {@link Msgs.AuthStateChanged} (optional)
 * @emits {@link Msgs.ProviderEvent} (optional)
 */
store.sub(userAtom, () => {
    // emit all user changes to the front end
    // permissions are handled internal to emitUserUpdate
    // so this is always safe to call.
    // when users re-connect, the stored atom won't be updated
    // so we also need to emit on authState change
    emitUserUpdate(store.get(userAtom))
})

/**
 * Asynchronously updates the ENS username when the user updates.
 * The ENS username is looked up on Ethereum mainnet.
 *
 * Note that users are always created froms scratch so there is no need to clear the ENS username
 * anywhere.
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
