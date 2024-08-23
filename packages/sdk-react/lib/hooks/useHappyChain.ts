import { useContext } from "react"

import type { HappyProvider, HappyUser } from "@happychain/js"
import { happyProvider } from "@happychain/js"

import { HappyContext } from "../components/HappyContext"

export function useHappyChain(): {
    provider: HappyProvider
    user?: HappyUser
} {
    const user = useContext(HappyContext)

    return {
        provider: happyProvider,
        user,
    }
}
