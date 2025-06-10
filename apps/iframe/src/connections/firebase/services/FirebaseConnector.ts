import { type Address, type RejectType, type ResolveType, retry, waitForValue } from "@happy.tech/common"
import {
    type ConnectionProvider,
    type HappyUser,
    type Msgs,
    type MsgsFromApp,
    type MsgsFromWallet,
    WalletType,
} from "@happy.tech/wallet-common"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import {
    type AuthProvider as FirebaseAuthProvider,
    type User as FirebaseAuthUser,
    browserPopupRedirectResolver,
    onAuthStateChanged,
    signInWithPopup,
} from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { getBoopAccountAddress } from "#src/connections/boopAccount"
import { StorageKey, storage } from "#src/services/storage"
import { getPermissions } from "#src/state/permissions"
import { getUser } from "#src/state/user"
import { getAppURL } from "#src/utils/appURL"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3AuthEIP1193Provider } from "../services/web3auth"
import { isConnected as isWeb3AuthConnected } from "../workers/web3auth.sw"

export enum FirebaseAuthState {
    Disconnected = "disconnected",
    Disconnecting = "disconnecting",
    Connected = "connected",
    Connecting = "connecting",
}

// Store in local storage to share current auth state progress across tabs
function getFirebaseAuthState() {
    return localStorage.getItem("firebase-cache") as FirebaseAuthState | undefined
}

function setFirebaseAuthState(val: FirebaseAuthState) {
    return localStorage.setItem("firebase-cache", val)
}

export class ConnectionProviderBusyError extends Error {
    constructor(message = "Connection Provider Is Busy") {
        super(message)
        this.name = "ConnectionProviderBusyError"
    }
}

export class ConnectionAbortedError extends Error {
    constructor(message = "Connection Aborted") {
        super(message)
        this.name = "ConnectionAbortedError"
    }
}

export abstract class FirebaseConnector implements ConnectionProvider {
    public readonly type: string
    public readonly id: string
    public readonly name: string
    public readonly icon: string

    protected constructor(opts: { name: string; icon: string }) {
        this.type = WalletType.Social
        this.id = `${this.type}:firebase:${opts.name}`.toLowerCase()
        this.name = opts.name
        this.icon = opts.icon

        this.listenForAuthChange()
    }

    abstract getAuthProvider(): FirebaseAuthProvider
    abstract onConnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onReconnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onDisconnect(): Promise<void> | void

    /**
     * When a user manually connects or disconnects, we mark this flag true. This prevents the
     * firebase auth listener onAuthStateChanged from simultaneously connecting with the web3Auth
     * network upon a successful firebase connection.
     *
     * It gets set to false when onAuthStateChanged response after the login attempt
     */
    #userInitiatedAction = false

    public async connect(
        request: MsgsFromApp[Msgs.ConnectRequest],
        signal: AbortSignal,
    ): Promise<MsgsFromWallet[Msgs.ConnectResponse]> {
        const { promise, reject, resolve } = Promise.withResolvers<MsgsFromWallet[Msgs.ConnectResponse]>()
        queueMicrotask(() => this.#connectAsync(request, signal, { resolve, reject }))
        return promise
    }

    async #connectAsync(
        request: MsgsFromApp[Msgs.ConnectRequest],
        signal: AbortSignal,
        { resolve, reject }: { resolve: ResolveType<MsgsFromWallet[Msgs.ConnectResponse]>; reject: RejectType },
    ) {
        // If we are already connecting/connected, don't attempt to connect again
        const authState = getFirebaseAuthState()
        if (authState !== FirebaseAuthState.Disconnected) reject(new ConnectionProviderBusyError())

        this.#userInitiatedAction = true

        // Set shared firebase auth state for other tabs to be aware
        setFirebaseAuthState(FirebaseAuthState.Connecting)

        // need to handle here with listeners so we can abort mid-async call, such as with
        // signInWithPopup, when we have no access to cancel it due to it being managed by firebase sdk
        // This will restore our wallet to 'new' state, and a subsequent connection attempt is unblocked
        // in the case of signInWithPopup with a 2nd attempt while the popup is still open, the old popup
        // will be closed and the new one will open automatically
        const handleAbort = async () => {
            setFirebaseAuthState(FirebaseAuthState.Disconnected)
            await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
            await this.onDisconnect()
            reject(new ConnectionAbortedError())
        }

        try {
            // listen for abort signal, and handle it by restoring the wallet to its initial state
            // this will also remove the firebase auth state from localStorage and disconnect
            // web3auth if available.
            signal.addEventListener("abort", handleAbort, { once: true })

            const userCredential = await signInWithPopup(
                firebaseAuth,
                this.getAuthProvider(),
                browserPopupRedirectResolver,
            )
            // if the signal is aborted, we have already returned the wallet to its starting state,
            // and are ready to accept a new connection attempt, however if the signInWithPopup
            // modal was _also_ successful, we will now need to (again) manually sign out of firebase
            // and clear its storage cache to avoid reconnecting on the next refresh automatically
            if (signal.aborted) throw new ConnectionAbortedError()

            const happyUser = await this.#connectFirebaseUserToWeb3Auth(userCredential.user)

            // See explanation for signal.aborted check after signInWithPopup
            if (signal.aborted) throw new ConnectionAbortedError()

            setFirebaseAuthState(FirebaseAuthState.Connected)
            await this.onConnect(happyUser, web3AuthEIP1193Provider)

            return resolve({
                request,
                response:
                    request.payload.method === "eth_requestAccounts"
                        ? [happyUser.address]
                        : getPermissions(getAppURL(), "eth_accounts"),
            })
        } catch (e) {
            setFirebaseAuthState(FirebaseAuthState.Disconnected)
            await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
            await this.onDisconnect()
            return reject(e)
        } finally {
            // Reset the user initiated action flag regardless of success or failure
            this.#userInitiatedAction = false
            signal.removeEventListener("abort", handleAbort)
        }
    }

    public async disconnect(): Promise<undefined> {
        try {
            this.#userInitiatedAction = true
            setFirebaseAuthState(FirebaseAuthState.Disconnecting)
            // just do our best to cancel all third parties, it may fail if they are already signed out for example
            await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
            await this.onDisconnect()
        } finally {
            // Reset the user initiated action flag regardless of success or failure
            setFirebaseAuthState(FirebaseAuthState.Disconnected)
            this.#userInitiatedAction = false
        }
    }

    async #connectFirebaseUserToWeb3Auth(user: FirebaseAuthUser, signal?: AbortSignal) {
        // (force) refetch fresh Firebase JWT - by default firebase will re-use the token if its still
        // valid, however web3auth throws an error if the token has been used before.
        const idToken = await user.getIdTokenResult(true)
        if (!idToken.claims.sub) throw new Error("No verified ID")
        if (signal?.aborted) throw new ConnectionAbortedError()
        // Connect to web3Auth using the JWT token
        const addresses = await this.#web3ConnectWithRetry({
            verifier: import.meta.env.VITE_WEB3AUTH_VERIFIER,
            verifierId: idToken.claims.sub,
            idToken: idToken.token,
        } satisfies JWTLoginParams)
        if (signal?.aborted) throw new ConnectionAbortedError()
        // Create or find the HappyAccount for the user
        const happyAccountAddress = await this.#getBoopAccountAddressWithRetry(addresses[0])
        if (signal?.aborted) throw new ConnectionAbortedError()
        const happyUser = {
            // connection type
            provider: this.id,
            type: WalletType.Social,

            // firebase auth social details
            avatar: user.photoURL || "",
            email: user.email || "",
            ens: "", // filled in later, async, using a jotai atom subscription
            name: user.displayName || "",
            uid: user.uid,

            // web3 details
            address: happyAccountAddress || addresses[0],
            controllingAddress: addresses[0],
        } satisfies HappyUser

        return happyUser
    }

    /**
     * Attempts to get the Boop account address for the given user address,
     * retrying up to 3 times with a 3 second wait between attempts.
     * If it fails, it will log a warning and throw an error.
     */
    async #getBoopAccountAddressWithRetry(address: Address): Promise<Address> {
        const maxRetries = 3
        const waitTime = 3_000
        try {
            const boopAccount = await retry(
                async () => await getBoopAccountAddress(address),
                maxRetries,
                waitTime,
                (attempt, error) =>
                    console.warn(`Failed to create Boop account, Retrying ${attempt}/${maxRetries}`, error),
            )
            if (!boopAccount) throw new Error("No address returned from getBoopAccountAddress")
            return boopAccount
        } catch (e) {
            console.warn("Failed to get Boop account address", e)
            throw e
        }
    }

    /**
     * Attempts to log in with web3 auth, retrying up to 3 times with a 3 second wait between attempts.
     * If it fails, it will log a warning and throw an error.
     */
    async #web3ConnectWithRetry(token: JWTLoginParams): Promise<[Address, ...Address[]]> {
        const maxRetries = 3
        const waitTime = 3_000

        try {
            const addresses = await retry(
                async () => await web3AuthConnect(token),
                maxRetries,
                waitTime,
                (attempt, error) =>
                    console.warn(`Failed to connect to web3Auth, Retrying ${attempt}/${maxRetries}`, error),
            )
            if (!addresses?.length) throw new Error("No addresses returned from web3Auth")
            return addresses as [Address, ...Address[]]
        } catch (e) {
            console.warn("Failed to connect to web3Auth after retries", e)
            throw e
        }
    }

    private listenForAuthChange() {
        onAuthStateChanged(firebaseAuth, async (_user) => {
            // if we land here but are processing a user initiated action (connect, disconnect) then
            // we will ignore this code-path, and let the user initiated action complete
            // this allows other tabs to listen for auth changes and connect/reconnect/disconnect
            // without interfering with the user initiated action.
            if (this.#userInitiatedAction) return

            const authState = getFirebaseAuthState()

            if (_user) {
                // new user logged in, or re-connected
                switch (authState) {
                    case FirebaseAuthState.Disconnecting:
                    case FirebaseAuthState.Disconnected: {
                        // ignore
                        return
                    }
                    case FirebaseAuthState.Connecting:
                    case FirebaseAuthState.Connected: {
                        const firebaseCachedUser = await waitForValue(
                            () => getUser() ?? storage.get(StorageKey.HappyUser),
                            30_000, // runs in background, 30 seconds should be more than enough time to check login
                            250,
                        )
                        if (!firebaseCachedUser) return

                        if (await isWeb3AuthConnected()) {
                            await this.onReconnect(firebaseCachedUser, web3AuthEIP1193Provider)
                            return
                        } else {
                            const happyUser = await this.#connectFirebaseUserToWeb3Auth(_user)
                            await this.onReconnect(happyUser, web3AuthEIP1193Provider)
                            return
                        }
                    }
                }
            } else {
                // user absent, disconnect, or not yet loaded. Sometimes on page load, during reconnect
                // this will be falsely null
                switch (authState) {
                    case FirebaseAuthState.Connecting:
                    case FirebaseAuthState.Connected: {
                        // no user, but we are trying to connect. just ignore this event
                        // later if the connection is successful and the full user is resolved,
                        // we will handle that
                        return
                    }
                    case FirebaseAuthState.Disconnecting:
                    case FirebaseAuthState.Disconnected: {
                        // already disconnected, or disconnecting
                        await this.disconnect()
                        return
                    }
                }
            }
        })
    }
}
