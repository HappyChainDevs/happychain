import { debounce } from "@happy.tech/common"
import { type HappyUser, Msgs } from "@happy.tech/wallet-common"
import { hasPermissions } from "#src/state/permissions.ts"
import { appMessageBus, happyProviderBus } from "../services/eventBus"
import { getAppURL, isStandaloneIframe } from "./appURL"

/**
 * Emits user info to the connected app after checking permissions.
 *
 * If current app is not embedded, this is a no-op. Otherwise, if the app has permissions and user
 * is logged in, the user info is emitted, and the app-side happyProvider will emit an
 * accountsChanged event.
 *
 * @emits {@link Msgs.UserChanged} (optional)
 * @emits {@link Msgs.ProviderEvent} (optional)
 */
export const emitUserUpdate = debounce((user?: HappyUser) => {
    if (isStandaloneIframe()) return

    const hasPerms = user ? hasPermissions(getAppURL(), "eth_accounts") : false
    const _user = hasPerms ? user : undefined
    const accounts = _user?.address ? [_user?.address] : []

    // emit full user update for dApp
    void appMessageBus.emit(Msgs.UserChanged, _user)

    // emit EIP1193 accountsChanged update
    void happyProviderBus.emit(Msgs.ProviderEvent, {
        payload: { event: "accountsChanged", args: accounts },
    })
}, 250)
