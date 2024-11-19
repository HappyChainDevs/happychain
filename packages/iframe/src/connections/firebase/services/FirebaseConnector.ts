import {
    type ConnectionProvider,
    type HappyUser,
    type Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
    WalletType,
} from "@happychain/sdk-shared"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import {
    GoogleAuthProvider,
    type User,
    browserPopupRedirectResolver,
    onAuthStateChanged,
    signInWithPopup,
} from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { getPermissions } from "#src/state/permissions.ts"
import { getAppURL } from "#src/utils/appURL.ts"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3AuthEIP1193Provider, web3AuthInit } from "../services/web3auth"
import {
    getFirebaseAuthState,
    getFirebaseSharedUser,
    setFirebaseAuthState,
    setFirebaseSharedUser,
} from "../workers/firebase.sw"
import { FirebaseAuthState } from "../workers/firebaseAuthState"
import { isConnected as isWeb3AuthConnected } from "../workers/web3auth.sw"

export abstract class FirebaseConnector implements ConnectionProvider {
    public readonly type: string
    public readonly id: string
    public readonly name: string
    public readonly icon: string

    constructor(opts: { name: string; icon: string }) {
        this.type = WalletType.Social
        this.id = `${this.type}:firebase:${opts.name}`.toLowerCase()
        this.name = opts.name
        this.icon = opts.icon

        this.listenForAuthChange()
    }

    abstract onConnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onReconnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onDisconnect(user: undefined, provider: EIP1193Provider): Promise<void> | void

    /**
     * When a user manually connects, we mark this flag true. This prevents the firebase auth
     * listener onAuthChange from simultaneously connecting with the web3Auth network upon a
     * successful firebase connection.
     *
     * It gets set to false when onAuthChange response after the login attempt
     */
    private instanceIsConnecting = false
    public async connect(request: MsgsFromApp[Msgs.ConnectRequest]): Promise<MsgsFromIframe[Msgs.ConnectResponse]> {
        this.instanceIsConnecting = true
        await setFirebaseAuthState(FirebaseAuthState.Connecting)
        try {
            const googleProvider = new GoogleAuthProvider()
            // forces select account screen on every connect
            googleProvider.setCustomParameters({ prompt: "select_account" })
            const userCredential = await signInWithPopup(firebaseAuth, googleProvider, browserPopupRedirectResolver)
            const token = await this.fetchLoginTokenForUser(userCredential.user)
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
                        ? happyUser.addresses
                        : getPermissions(getAppURL(), "eth_accounts"),
            }
        } catch (e) {
            await setFirebaseAuthState(FirebaseAuthState.Disconnected)
            throw e
        }
    }

    public async disconnect() {
        try {
            await setFirebaseAuthState(FirebaseAuthState.Disconnecting)
            await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
            await this.onDisconnect(undefined, web3AuthEIP1193Provider)
            await setFirebaseAuthState(FirebaseAuthState.Disconnected)
        } catch (e) {
            console.warn(e)
            const next = (await isWeb3AuthConnected()) ? FirebaseAuthState.Connected : FirebaseAuthState.Disconnected
            await setFirebaseAuthState(next)
        }
    }

    private static makeHappyUserPartial(user: User, id: string) {
        return {
            // connection type
            type: WalletType.Social,
            provider: id,
            // social details
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || "",
            ens: "", // filled in later, async, using a jotai atom subscription
            avatar: user.photoURL || "",
        } satisfies Omit<HappyUser, "address" | "addresses">
    }

    private static makeHappyUser(
        user: ReturnType<typeof FirebaseConnector.makeHappyUserPartial>,
        addresses: `0x${string}`[],
    ) {
        return {
            ...user,
            // web3 details
            address: addresses[0],
            addresses,
        } satisfies HappyUser
    }

    private async connectWithWeb3Auth(
        partialUser: ReturnType<typeof FirebaseConnector.makeHappyUserPartial>,
        token: JWTLoginParams,
    ) {
        for (let i = 0; i < 5; i++) {
            try {
                await web3AuthInit()

                // have to refresh JWT since web3auth fails if duplicate token is found
                const addresses = await web3AuthConnect(token)
                const user = FirebaseConnector.makeHappyUser(partialUser, addresses)
                await setFirebaseSharedUser(user)
                return user
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 1_000))
            }
        }
    }

    private async fetchLoginTokenForUser(user: User) {
        const token = await user.getIdTokenResult(true)

        if (!token.claims.sub) {
            throw new Error("No verified ID")
        }

        return {
            verifier: import.meta.env.VITE_WEB3AUTH_VERIFIER,
            verifierId: token.claims.sub,
            idToken: token.token,
        } satisfies JWTLoginParams
    }

    private listenForAuthChange() {
        onAuthStateChanged(firebaseAuth, async (_user) => {
            if (!_user) {
                if ((await getFirebaseAuthState()) !== FirebaseAuthState.Disconnecting) {
                    await this.disconnect()
                }
                return
            }

            // if we land here and have a _user, and are already connecting, then another connection
            // attempt must be ongoing elsewhere. Exit early, and leave state updates to whoever is
            // currently connecting
            if (this.instanceIsConnecting === true) {
                this.instanceIsConnecting = false
                return
            }

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

            const token = await this.fetchLoginTokenForUser(_user)

            const happyUser = await this.connectWithWeb3Auth(
                FirebaseConnector.makeHappyUserPartial(_user, this.id),
                token,
            )

            if (happyUser) {
                await this.onReconnect(happyUser, web3AuthEIP1193Provider)
            } else {
                console.warn("failed to connect")
            }
        })
    }
}
