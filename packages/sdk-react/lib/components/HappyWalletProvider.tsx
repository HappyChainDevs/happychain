import type { HappyUser } from "@happychain/js"
// HappyWalletProvider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type SDK = typeof import("@happychain/js")
type HappyWalletProviderProps = React.PropsWithChildren & {
    init?: Parameters<typeof import("@happychain/js").register>[0]
}

type THappyContext = {
    user: HappyUser | undefined
    initialized: boolean
    sdk: SDK | null
}

export const HappyContext = createContext<THappyContext>({ user: undefined, initialized: false, sdk: null })

export function HappyWalletProvider({ init, children }: HappyWalletProviderProps): React.JSX.Element {
    const [user, setUser] = useState<HappyUser | undefined>()
    const [sdk, setSdk] = useState<SDK | null>(null)

    useEffect(() => {
        // 1. Ensure we are in a browser context
        if (typeof window !== "undefined") {
            // 2. Dynamically load the JS SDK
            import("@happychain/js").then((loadedSdk) => {
                // register iframe component
                loadedSdk.register(init)

                // subscription to user changes
                loadedSdk.onUserUpdate(setUser)
                setSdk(loadedSdk)
            })
        }
    }, [init])

    return (
        <HappyContext.Provider
            value={{
                user,
                initialized: Boolean(sdk),
                sdk,
            }}
        >
            {children}
        </HappyContext.Provider>
    )
}

export function useHappyChain() {
    const { user, initialized, sdk } = useContext(HappyContext)

    useEffect(() => {
        if (!initialized) {
            console.warn("useHappyChain() is not initialized. Did you miss adding <HappyWalletProvider />?")
        }
    }, [initialized])

    return {
        provider: sdk?.happyProvider,
        connect: sdk?.connect,
        disconnect: sdk?.disconnect,
        user,
        showSendScreen: sdk?.showSendScreen,
    }
}
