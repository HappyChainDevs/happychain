import { AuthState } from "@happy.tech/wallet-common"
import { useEffect, useState } from "preact/hooks"
import { internalProvider } from "../../happyProvider"

export function useAuthState() {
    const [authState, setAuthState] = useState(AuthState.Initializing)
    useEffect(() => internalProvider.onAuthStateUpdate(setAuthState), [])
    return { authState }
}
