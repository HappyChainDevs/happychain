import { AuthState, Msgs } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/vanilla"
import { http, createPublicClient } from "viem"
import { mainnet } from "viem/chains"
import { appMessageBus } from "../services/eventBus"
import { hasPermissions } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

const store = getDefaultStore()

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

    const permitted = hasPermissions("eth_account")
    const user = store.get(userAtom)
    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        emitUserUpdate(user)
    }
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
    const user = store.get(userAtom)
    const permitted = hasPermissions("eth_accounts")

    // we sync all logout events to the front end
    // and all login updates if the dapp has permissions
    if (!user || permitted) {
        emitUserUpdate(user)
    }
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
