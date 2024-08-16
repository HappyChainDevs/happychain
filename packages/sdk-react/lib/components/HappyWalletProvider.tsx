import { type PropsWithChildren, useEffect, useState } from 'react'

import type { HappyUser } from '@happychain/js'
import { onUserUpdate, register } from '@happychain/js'

import { HappyContext } from './HappyContext'

let initialUser: HappyUser | undefined

// start tracking user updates even before react loads
const initListener = onUserUpdate((user) => {
    initialUser = user
})

// auto registration of happy wallet
register()

export function HappyWalletProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<HappyUser | undefined>(initialUser)

    // subscription to user changes
    useEffect(() => {
        const effectListener = onUserUpdate((user) => setUser(user))

        return () => {
            initListener()
            effectListener()
        }
    }, [])

    return <HappyContext.Provider value={user}>{children}</HappyContext.Provider>
}
