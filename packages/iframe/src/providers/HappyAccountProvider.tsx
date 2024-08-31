import { init as web3AuthInit } from "@happychain/firebase-web3auth-strategy"
import { logger } from "@happychain/sdk-shared"
import { type PropsWithChildren, useEffect, useState } from "react"

import { useProcessConfirmedRequests } from "../hooks/useProcessConfirmedRequests"
import { useProcessUnconfirmedRequests } from "../hooks/useProcessUnconfirmedRequests"
import { useProviderEventsProxy } from "../hooks/useProviderEventsProxy"

function useInitializeWeb3() {
    const [isWeb3Initialized, setIsWeb3Initialized] = useState(false)

    useEffect(() => {
        const init = async () => {
            await web3AuthInit()
            setIsWeb3Initialized(true)
            logger.log("Web3Auth is initialized")
        }
        init()
    }, [])

    return { isWeb3Initialized }
}

export function HappyAccountProvider({ children }: PropsWithChildren) {
    const { isWeb3Initialized } = useInitializeWeb3()

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

    /**
     * Processes requests that have been explicitly
     * approved (or rejected) by the user
     */
    useProcessConfirmedRequests()

    /**
     * Processes requests that have been allowed
     * to bypass the user confirmation screen
     */
    useProcessUnconfirmedRequests()

    if (!isWeb3Initialized) {
        return null
    }
    return children
}
