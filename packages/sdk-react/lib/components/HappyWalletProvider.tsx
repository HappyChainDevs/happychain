import { PropsWithChildren, useEffect, useState } from 'react'

import type { HappyUser } from '@happychain/js'
import { onUserUpdate, register } from '@happychain/js'
import { HappyContext } from './HappyContext'

// auto registration of happy wallet
register()

export function HappyWalletProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<HappyUser | null>(null)

    // subscription to user changes
    useEffect(() => onUserUpdate((user) => setUser(user)), [])

    return <HappyContext.Provider value={user}>{children}</HappyContext.Provider>
}
