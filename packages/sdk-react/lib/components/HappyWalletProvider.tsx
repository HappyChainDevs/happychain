import { createContext, useContext, useEffect, useState } from "react"

import type { HappyUser } from "@happychain/js"
import {
    connect,
    disconnect,
    getCurrentUser,
    happyProvider,
    onUserUpdate,
    register,
    showSendScreen,
} from "@happychain/js"

type HappyWalletProviderProps = React.PropsWithChildren & {
    init?: Parameters<typeof register>[0]
}

type THappyContext = {
    user: HappyUser | undefined
    initialized: boolean
}

export const HappyContext = createContext<THappyContext>({ user: undefined, initialized: false })

export function HappyWalletProvider({ init, children }: HappyWalletProviderProps): React.JSX.Element {
    const [user, setUser] = useState<HappyUser | undefined>(getCurrentUser())

    // register iframe component
    useEffect(() => register(init), [init])

    // subscription to user changes
    useEffect(() => onUserUpdate((user) => setUser(user)), [])

    return <HappyContext.Provider value={{ user, initialized: true }}>{children}</HappyContext.Provider>
}

export function useHappyChain() {
    const { user, initialized } = useContext(HappyContext)

    useEffect(() => {
        if (!initialized) {
            console.warn("useHappyChain() is not initialized. Did you miss adding <HappyWalletProvider />?")
        }
    }, [initialized])

    return {
        provider: happyProvider,
        connect,
        disconnect,
        user,
        showSendScreen,
    }
}
