import { Msgs } from "@happychain/sdk-shared"
import { type PropsWithChildren, useEffect } from "react"
import { useProviderEventsProxy } from "../hooks/useProviderEventsProxy"
import { appMessageBus } from "../services/eventBus"

export function HappyAccountProvider({ children }: PropsWithChildren) {
    /**
     * Proxy the underlying (web3Auth) provider events
     * to the front end dapp
     */
    useProviderEventsProxy([
        "connect",
        "disconnect",
        "chainChanged",
        // accountsChanged will not be proxied to the front end
        // as user data is exposed or withheld based on the permissions system
        // 'accountsChanged'
    ])

    useEffect(() => {
        void appMessageBus.emit(Msgs.IframeInit, true)
    }, [])

    return children
}
