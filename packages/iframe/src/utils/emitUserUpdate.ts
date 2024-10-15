import { type HappyUser, Msgs } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"
import { hasPermissions } from "../services/permissions"
import { getAppURL, isStandaloneIframe } from "./appURL"

export function emitUserUpdate(user?: HappyUser) {
    if (isStandaloneIframe()) return

    const _user = hasPermissions(getAppURL(), "eth_accounts") ? user : undefined
    // emit full user update for dApp
    void appMessageBus.emit(Msgs.UserChanged, _user)

    // emit EIP1193 accountsChanged update
    void happyProviderBus.emit(Msgs.ProviderEvent, {
        payload: { event: "accountsChanged", args: _user?.addresses ?? [] },
    })
}
