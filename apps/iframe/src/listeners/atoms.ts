import { Msgs } from "@happy.tech/wallet-common"
import { getDefaultStore } from "jotai/vanilla"
import { http, createPublicClient } from "viem"
import { mainnet } from "viem/chains"
import { permissionsMapLegend } from "#src/state/permissions/observable"
import { appMessageBus } from "../services/eventBus"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

const store = getDefaultStore()

/**
 * Runs once at startup to transmit the current auth state to the app. Will be one of
 * {@link AuthState.Disconnected}, or {@link AuthState.Initializing} depending on if a
 * user is cached in local storage or not
 *
 * @emits {@link Msgs.AuthStateChanged}
 */
void appMessageBus.emit(Msgs.AuthStateChanged, store.get(authStateAtom))

/**
 * Emits the current auth & user state to the app when it changes.
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

    emitUserUpdate(store.get(userAtom))
})

/**
 * Emits user updates to the app if permitted and needed.
 *
 * @listens userAtom
 *
 * @emits {@link Msgs.UserChanged} (optional)
 * @emits {@link Msgs.ProviderEvent} (optional)
 */
store.sub(userAtom, () => {
    emitUserUpdate(store.get(userAtom))
})

/**
 * If a user exists in the atom at page load, lets emit this to the front end immediately
 * while the web3 components get wired up
 */
if (store.get(userAtom)) emitUserUpdate(store.get(userAtom))

/**
 * Emits user updates to the app if permitted and needed.
 *
 * @listens permissionsMapAtom
 *
 * @emits {@link Msgs.UserChanged} (optional)
 * @emits {@link Msgs.ProviderEvent} (optional)
 */
permissionsMapLegend.onChange(() => {
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

    try {
        const ensName = await mainnetClient.getEnsName({ address: user.address })
        if (!ensName) return
        user.ens = ensName
        store.set(userAtom, user)
    } catch {
        console.warn(`Failed to check ENS name for address ${user.address}`)
    }
})
