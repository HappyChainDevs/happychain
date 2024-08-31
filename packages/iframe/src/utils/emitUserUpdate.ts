import type { HappyUser } from "@happychain/sdk-shared"
import { dappMessageBus, happyProviderBus } from "../services/eventBus"

export function emitUserUpdate(user?: HappyUser) {
    // emit full user update for dApp
    dappMessageBus.emit("auth-changed", user)

    // emit EIP1193 accountsChanged update
    happyProviderBus.emit("provider:event", {
        payload: { event: "accountsChanged", args: user?.address ? [user.address] : [] },
    })
}
