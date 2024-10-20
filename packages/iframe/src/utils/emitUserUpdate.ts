import { type HappyUser, Msgs } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"
import { isStandaloneIframe } from "./appURL"

export function emitUserUpdate(user?: HappyUser) {
    if (isStandaloneIframe()) return

    // emit full user update for dApp
    void appMessageBus.emit(Msgs.UserChanged, user)

    // emit EIP1193 accountsChanged update
    void happyProviderBus.emit(Msgs.ProviderEvent, {
        payload: { event: "accountsChanged", args: user?.address ? [user.address] : [] },
    })
}
