import { type HappyUser, Msgs } from "@happychain/sdk-shared"
import { appMessageBus, happyProviderBus } from "../services/eventBus"
import { hasPermissions } from "../services/permissions"
import { getDappOrigin } from "./getDappOrigin"

function debounceEvent(callback: (user?: HappyUser) => void, time: number) {
    let interval: Timer | undefined = undefined
    return (user?: HappyUser) => {
        clearTimeout(interval)
        interval = setTimeout(() => {
            interval = undefined
            callback(user)
        }, time)
    }
}

export const emitUserUpdate = debounceEvent((user?: HappyUser) => {
    console.log("Emitting User Update", user)
    const hasPerms = hasPermissions("eth_accounts", { origin: getDappOrigin() })
    const _user = hasPerms ? user : undefined
    const accounts = hasPerms && user?.address ? [user.address] : []

    console.log("Emitting on app bus", _user)
    // emit full user update for dApp
    appMessageBus.emit(Msgs.UserChanged, _user)

    console.log("Emitting on provider", accounts)
    // emit EIP1193 accountsChanged update
    happyProviderBus.emit(Msgs.ProviderEvent, {
        payload: { event: "accountsChanged", args: accounts },
    })
}, 250)
