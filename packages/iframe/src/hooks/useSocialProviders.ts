import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy"
import { AuthState, type ConnectionProvider } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { grantPermissions, hasPermissions } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

// Whether to grant the eth_accounts permission upon login.
// Set whenever the user logins on the current dapp explicit, not when he is automatically
// logged in in the iframe from having previously logged in on a different dapp.
const needsImplicitConnectionPerm = { current: false }

// NOTE: The above variable needs to exist outside of React because `useSocialProvider` is called in
// the modal, who disappears upon log in, to be taken over by the use of the same hook in /embed.
// This is a big hack, the listener should exist outside of React.

export function useSocialProviders() {
    const setAuthState = useSetAtom(authStateAtom)
    const userValue = useAtomValue(userAtom)

    const { connectAsync, connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()

    const { status: wagmiStatus } = useAccount()

    const { providers, onAuthChange } = useFirebaseWeb3AuthStrategy()

    useEffect(() => {
        onAuthChange(async (user, provider) => {
            // sync local user+provider state with internal plugin updates

            // TODO This is an absolute clusterfudge and needs to live outside of React.
            //      The approach of having a listener inside `useEffect` is hacky and brittle,
            //      especially since `useSocialProviders` is called both in `ConectModal` and
            //      `Embed` at the same time — I'm not quite sure why that doesn't cause duplicate
            //      updates.

            // The next four states are complete and mutually exclusive.

            // User in param, but no in atom, writing user to atom.
            const loggingIn = Boolean(user && !userValue?.type)
            // User in param and in atom.
            const loggedIn = Boolean(user && userValue?.type)
            // User in atom, but not in param, erasing user from atom.
            const loggingOut = Boolean(!user && userValue?.type)
            // No user in param or atom.
            const loggedOut = !loggingIn && !loggedIn && !loggingOut

            // === UPDATE SEQUENCING ===
            //
            // Note: The last state in each flow can always recur (e.g. hot reload).
            //
            // # page load, logged out
            //   - loggedOut,  wagmi: disconnected
            //
            // # login from app w/ no pre-existing connect permission
            //   - loggingIn, wagmi: disconnected, grant perm: true
            //   - loggedIn,  wagmi: disconnected, grant perm: true
            //   - loggedIn,  wagmi: connecting,   grant perm: false
            //   - loggedIn,  wagmi: connected,    grant perm: false
            //
            // # login from app w/ existing connect permission
            //   To be tested, no possible yet as we clear out the permissions on logout.
            //   (`clearPermissions` from `setUserWithProvider`)
            //
            // # page load, logged in w/ no pre-existing connect permission
            //   → Same as login from app, but `needsImplicitConnectionPerm` is always false.
            //   - loggingIn, wagmi: disconnected
            //   - loggedIn,  wagmi: disconnected
            //   - loggedIn,  wagmi: connecting
            //   - loggedIn,  wagmi: connected
            //
            // # page load, logged in w/ pre-existing connect permission
            //   To be tested, no possible yet as there is no way to clear permissions manually
            //   (only cleared on logout).
            //
            // # connecting & disconnecting
            //   Nothing happens! As expected: connect/disconnect doesn't affect login status, nor
            //   the internal iframe wagmi provider.
            //
            // # logout
            //   - loggingOut, wagmi: connected
            //   - loggedOut,  wagmi: connected
            //   - loggedOut,  wagmi: connected (yes, repeated *)
            //   - loggedOut,  wagmi: disconnected
            //   (*) Unfortunately sending the wagmi disconnect request twice, this is benign.

            // Must be called on all auth changes.
            // Must also be first, as permission & connection logic depends on the user being set.
            setUserWithProvider(user, provider)

            // We want the next block before any await, to avoid granting multiple times (which at
            // current is benign, just wasteful) and updating the user as soon as possible.

            if (loggedIn) {
                // Logged in from the app, implicitly grant `eth_accounts` (connection) permission.
                if (needsImplicitConnectionPerm.current) {
                    needsImplicitConnectionPerm.current = false // only grant once
                    grantPermissions("eth_accounts")
                    emitUserUpdate(user)
                } else if (hasPermissions("eth_accounts")) {
                    // The user is automatically sent to the app whenever the user changes or
                    // when the `eth_accounts` permission is granted. However, if reconnecting on
                    // page load, neither of these change, and we need to manually send here.
                    emitUserUpdate(user)
                }
            }

            // Connect/disconnect the wagmi provider (for iframe-initiated transactions).
            // We need the `needsImplicitConnectionPerm` check to avoid reconnecting on logout.
            if (loggedIn && wagmiStatus === "disconnected") {
                await connectAsync({ connector: connectors[0] })
            } else if (loggedOut && wagmiStatus === "connected") {
                await disconnectAsync()
            }
        })
    }, [onAuthChange, userValue, connectAsync, disconnectAsync, connectors, wagmiStatus])

    // Returns the provider list with patched enable() / disable() functions.
    return useMemo(
        () =>
            providers.map(
                (provider) =>
                    ({
                        ...provider,
                        enable: async () => {
                            // Will automatically disable loading state when user+provider are set
                            // in `setUserWithProvider`.
                            setAuthState(AuthState.Connecting)
                            // We're logging in on the current dapp, grant connection permission.
                            needsImplicitConnectionPerm.current = true
                            await provider.enable()
                        },
                        disable: async () => {
                            // will automatically disable loading state when user+provider are set
                            setAuthState(AuthState.Connecting)
                            await provider.disable()
                        },
                    }) satisfies ConnectionProvider,
            ),
        [providers, setAuthState],
    )
}
