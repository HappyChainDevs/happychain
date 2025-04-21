import type { Prettify } from "@happy.tech/common"
import { type HappyUser, type LoadHappyWalletOptions, loadHappyWallet, onUserUpdate } from "@happy.tech/core"
import { createContext, useContext, useEffect, useState } from "react"

export type { LoadHappyWalletOptions }

export type HappyWalletProviderProps = Prettify<
    React.PropsWithChildren & {
        init?: LoadHappyWalletOptions
    }
>

type THappyContext = {
    user: HappyUser | undefined
    initialized: boolean
}

export const HappyContext = createContext<THappyContext>({ user: undefined, initialized: false })

export function HappyWalletProvider({ init, children }: HappyWalletProviderProps): React.JSX.Element {
    const [user, setUser] = useState<HappyUser | undefined>()

    // register iframe component
    useEffect(() => loadHappyWallet(init), [init])

    // subscription to user changes
    useEffect(() => {
        onUserUpdate(setUser)
    }, [])

    return <HappyContext.Provider value={{ user, initialized: true }}>{children}</HappyContext.Provider>
}

export function useHappyWallet() {
    const { user, initialized } = useContext(HappyContext)

    useEffect(() => {
        if (!initialized) {
            console.warn("useHappyWallet() is not initialized. Did you miss adding <HappyWalletProvider />?")
        }
    }, [initialized])

    return {
        initialized,
        user,
    }
}
