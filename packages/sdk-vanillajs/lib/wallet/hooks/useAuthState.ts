import { AuthState } from "@happychain/sdk-shared"
import { useEffect, useState } from "preact/hooks"
import { onAuthStateUpdate } from "../../happyProvider/initialize"

export function useAuthState() {
    const [authState, setAuthState] = useState(AuthState.Connecting)
    useEffect(() => onAuthStateUpdate(setAuthState), [])
    return { authState }
}
