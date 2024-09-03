import { useEffect, useState } from "react"

import type { HappyUser } from "@happychain/js"
import { getCurrentUser, onUserUpdate, register } from "@happychain/js"

import { HappyContext } from "./HappyContext"

// auto registration of happy wallet

type HappyWalletProviderProps = React.PropsWithChildren & {
    init?: Parameters<typeof register>[0]
}

export function HappyWalletProvider({ init, children }: HappyWalletProviderProps): React.JSX.Element {
    const [user, setUser] = useState<HappyUser | undefined>(getCurrentUser())

    // register iframe component
    useEffect(() => register(init), [init])

    // subscription to user changes
    useEffect(() => onUserUpdate((user) => setUser(user)), [])

    return <HappyContext.Provider value={user}>{children}</HappyContext.Provider>
}
