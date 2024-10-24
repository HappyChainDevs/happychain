import { AuthState, type ConnectionProvider } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { GoogleConnector } from "../connections/GoogleConnector"
import { setAuthState } from "../state/authState"
import { userAtom } from "../state/user"

// NOTE: The above variable needs to exist outside of React because `useSocialProvider` is called in
// the modal, who disappears upon log in, to be taken over by the use of the same hook in /embed.
// This is a big hack, the listener should exist outside of React.

const googleConnector = new GoogleConnector()

const providers = [googleConnector].map(
    (provider) =>
        ({
            ...provider,
            disconnect: provider.disconnect,
            connect: async () => {
                try {
                    // will automatically disable loading state when user+provider are set
                    setAuthState(AuthState.Connecting)
                    await provider.connect()
                } catch (e) {
                    setAuthState(AuthState.Disconnected)
                    throw e
                }
            },
        }) as ConnectionProvider,
)

export function useSocialProviders() {
    const { connectAsync, connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()
    const user = useAtomValue(userAtom)
    const { status: wagmiStatus } = useAccount()
    /**
     * Connect wagmi on user details changing
     */
    useEffect(() => {
        // TODO: this works but applies to injected wallets also, will be tackled in injected wallet
        // refactor: https://github.com/HappyChainDevs/happychain/pull/191
        const init = async () => {
            if (user && wagmiStatus === "disconnected") {
                await connectAsync({ connector: connectors[0] })
            } else if (!user && wagmiStatus === "connected") {
                await disconnectAsync()
            }
        }
        init()
    }, [user, connectAsync, connectors, disconnectAsync, wagmiStatus])

    return providers
}
