import { connect, disconnect, happyProvider } from "@happychain/js"
import { useContext } from "react"
import { HappyContext } from "../components/HappyContext"

export function useHappyChain() {
    const user = useContext(HappyContext)

    return {
        provider: happyProvider,
        connect,
        disconnect,
        user,
    }
}
