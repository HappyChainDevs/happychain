import { init as web3AuthInit } from "@happychain/firebase-web3auth-strategy"
import { Msgs, logger } from "@happychain/sdk-shared"
import { type PropsWithChildren, useEffect, useState } from "react"

import { useProviderEventsProxy } from "../hooks/useProviderEventsProxy"
import { appMessageBus } from "../services/eventBus"

function useInitializeWeb3() {
    const [isWeb3Initialized, setIsWeb3Initialized] = useState(false)

    useEffect(() => {
        const init = async () => {
            await web3AuthInit()
            setIsWeb3Initialized(true)
            logger.log("Web3Auth is initialized")
        }
        void init()
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

    useEffect(() => {
        if (isWeb3Initialized) {
            void appMessageBus.emit(Msgs.IframeInit, true)
        }
    }, [isWeb3Initialized])

    if (!isWeb3Initialized) {
        return null
    }

    return children
}
