import type { HappyUser } from "@happy.tech/wallet-common"
import { useEffect, useState } from "preact/hooks"
import { onUserUpdate } from "../../functions"

export function useHappyUser() {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)
    useEffect(() => onUserUpdate(setUser), [])
    return { user }
}
