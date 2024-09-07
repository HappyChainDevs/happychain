import type { HappyUser } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"

export function emitUserUpdate(user?: HappyUser) {
    // emit full user update for dApp
    appMessageBus.emit("auth-changed", user)

    // emit EIP1193 accountsChanged update
    happyProviderBus.emit("provider:event", {
        payload: { event: "accountsChanged", args: user?.address ? [user.address] : [] },
    })
}
