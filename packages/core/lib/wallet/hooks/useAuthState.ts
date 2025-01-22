import { AuthState } from "@happy.tech/wallet-common"
import { useEffect, useState } from "preact/hooks"
import { onAuthStateUpdate } from "../../happyProvider/initialize"

export function useAuthState() {
    const [authState, setAuthState] = useState(AuthState.Initializing)
    useEffect(() => onAuthStateUpdate(setAuthState), [])
    return { authState }
}
