import { type HappyUser, Msgs } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"

export function emitUserUpdate(user?: HappyUser) {
    // emit full user update for dApp
    appMessageBus.emit(Msgs.UserChanged, user)

    // emit EIP1193 accountsChanged update
    happyProviderBus.emit(Msgs.ProviderEvent, {
        payload: { event: "accountsChanged", args: user?.address ? [user.address] : [] },
    })
}
