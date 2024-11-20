import type { PropsWithChildren } from "react"
import { useProviderEventsProxy } from "../hooks/useProviderEventsProxy"

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

    return children
}
