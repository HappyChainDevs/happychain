import { type Address, retry } from "@happy.tech/common"
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
import { getPermissions } from "#src/state/permissions"
import { getAppURL } from "#src/utils/appURL"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3AuthEIP1193Provider } from "../services/web3auth"
import {
    getFirebaseAuthState,
    getFirebaseSharedUser,
    setFirebaseAuthState,
    setFirebaseSharedUser,
} from "../workers/firebase.sw"
import { FirebaseAuthState } from "../workers/firebase/firebaseAuthState"
import { isConnected as isWeb3AuthConnected } from "../workers/web3auth.sw"

type HappyUserDetails = Omit<HappyUser, "address" | "controllingAddress">

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

    public async connect(request: MsgsFromApp[Msgs.ConnectRequest]): Promise<MsgsFromWallet[Msgs.ConnectResponse]> {
        // If we are already connecting/connected, don't attempt to connect again
        const prev = await getFirebaseAuthState()
        if (prev !== FirebaseAuthState.Disconnected) throw new Error("Already Connecting Elsewhere")

        this.#userInitiatedAction = true

        // Set shared firebase auth state for other tabs to be aware
        await setFirebaseAuthState(FirebaseAuthState.Connecting)
        try {
            const userCredential = await signInWithPopup(
                firebaseAuth,
                this.getAuthProvider(),
                browserPopupRedirectResolver,
            )
            const token = await this.#fetchFirebaseTokenForUser(userCredential.user)
            const happyUser = await this.connectWithWeb3Auth(
                FirebaseConnector.makeHappyUserPartial(userCredential.user, this.id),
                token,
            )
            if (!happyUser) throw new Error(`Failed to connect ${this.id}`)
            await setFirebaseAuthState(FirebaseAuthState.Connected)
            await this.onConnect(happyUser, web3AuthEIP1193Provider)
            return {
                request,
                response:
                    request.payload.method === "eth_requestAccounts"
                        ? [happyUser.address]
                        : getPermissions(getAppURL(), "eth_accounts"),
            }
        } catch (e) {
            await setFirebaseAuthState(FirebaseAuthState.Disconnected)
            throw e
        } finally {
            // Reset the user initiated action flag regardless of success or failure
            this.#userInitiatedAction = false
        }
    }

    public async disconnect(): Promise<undefined> {
        try {
            this.#userInitiatedAction = true
            await setFirebaseAuthState(FirebaseAuthState.Disconnecting)
            await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
            await this.onDisconnect()
            await setFirebaseAuthState(FirebaseAuthState.Disconnected)
        } catch (e) {
            console.warn(e)
            const next = (await isWeb3AuthConnected()) ? FirebaseAuthState.Connected : FirebaseAuthState.Disconnected
            await setFirebaseAuthState(next)
        } finally {
            // Reset the user initiated action flag regardless of success or failure
            this.#userInitiatedAction = false
        }
    }

    private static makeHappyUserPartial(user: FirebaseAuthUser, id: string) {
        return {
            // connection type
            provider: id,
            type: WalletType.Social,

            // social details
            avatar: user.photoURL || "",
            email: user.email || "",
            ens: "", // filled in later, async, using a jotai atom subscription
            name: user.displayName || "",
            uid: user.uid,
        } satisfies HappyUserDetails
    }

    private static makeHappyUser(user: HappyUserDetails, addresses: Address[], smartAccountAddress: Address) {
        return {
            ...user,
            // web3 details
            address: smartAccountAddress || addresses[0],
            controllingAddress: addresses[0],
        }
    }

    private async connectWithWeb3Auth(
        partialUser: ReturnType<typeof FirebaseConnector.makeHappyUserPartial>,
        token: JWTLoginParams,
    ) {
        const addresses = await this.#web3ConnectWithRetry(token)
        if (!addresses || addresses.length === 0) return await this.disconnect()

        const happyAccountAddress = await this.#getBoopAccountAddressWithRetry(addresses[0])
        if (!happyAccountAddress) return await this.disconnect()

        const user = FirebaseConnector.makeHappyUser(partialUser, addresses, happyAccountAddress)
        await setFirebaseSharedUser(user)
        return user
    }

    async #getBoopAccountAddressWithRetry(address: Address): Promise<Address | undefined> {
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
        }
    }

    async #web3ConnectWithRetry(token: JWTLoginParams): Promise<Address[] | undefined> {
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
            if (!addresses || addresses.length === 0) throw new Error("No addresses returned from web3Auth")
            return addresses
        } catch (e) {
            console.warn("Failed to connect to web3Auth after retries", e)
        }
    }

    async #fetchFirebaseTokenForUser(user: FirebaseAuthUser) {
        const token = await user.getIdTokenResult(true)
        if (!token.claims.sub) throw new Error("No verified ID")

        return {
            verifier: import.meta.env.VITE_WEB3AUTH_VERIFIER,
            verifierId: token.claims.sub,
            idToken: token.token,
        } satisfies JWTLoginParams
    }

    private listenForAuthChange() {
        onAuthStateChanged(firebaseAuth, async (_user) => {
            // if we land here but are processing a user initiated action (connect, disconnect) then
            // we will ignore this code-path, and let the user initiated action complete
            // this allows other tabs to listen for auth changes and connect/reconnect/disconnect
            // without interfering with the user initiated action.
            if (this.#userInitiatedAction) return

            if (!_user) return await this.disconnect()

            // web3auth doesn't need this call as calling connect() multiple times simply returns
            // the current user if they are already logged in, however each firebase JWT can be used
            // only once, so if a user is not connected already, we must refresh the JWT with
            // firebase prior to a connection.
            if (await isWeb3AuthConnected()) {
                const user = await getFirebaseSharedUser()
                if (user) {
                    await this.onReconnect(user, web3AuthEIP1193Provider)
                    return
                }
                // allow fall through to refresh JWT and log in again
                console.warn("failed to reconnect to network")
            }
            const token = await this.#fetchFirebaseTokenForUser(_user)
            const happyUser = await this.connectWithWeb3Auth(
                FirebaseConnector.makeHappyUserPartial(_user, this.id),
                token,
            )

            if (happyUser) {
                await this.onReconnect(happyUser, web3AuthEIP1193Provider)
            } else {
                console.warn("failed to re-connect")
            }
        })
    }
}
