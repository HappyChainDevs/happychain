import { type HappyUser, Messages } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"

export function emitUserUpdate(user?: HappyUser) {
    // emit full user update for dApp
    appMessageBus.emit(Messages.AuthChanged, user)

    // emit EIP1193 accountsChanged update
    happyProviderBus.emit(Messages.ProviderEvent, {
        payload: { event: "accountsChanged", args: user?.address ? [user.address] : [] },
    })
}
