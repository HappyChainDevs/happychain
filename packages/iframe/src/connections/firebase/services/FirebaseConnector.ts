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
    type AuthProvider,
    type User,
    browserPopupRedirectResolver,
    onAuthStateChanged,
    signInWithPopup,
} from "firebase/auth"
import { AccountNotFoundError } from "permissionless"
import type { EIP1193Provider } from "viem"
import { getKernelAccountAddress } from "#src/state/kernelAccount.ts"
import { getPermissions } from "#src/state/permissions.ts"
import { getAppURL } from "#src/utils/appURL.ts"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3AuthEIP1193Provider } from "../services/web3auth"
import {
    getFirebaseAuthState,
    getFirebaseSharedUser,
    setFirebaseAuthState,
    setFirebaseSharedUser,
} from "../workers/firebase.sw"
import { FirebaseAuthState } from "../workers/firebaseAuthState"
import { isConnected as isWeb3AuthConnected } from "../workers/web3auth.sw"

type HappyUserDetails = Omit<HappyUser, "address" | "controllingAddress">

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

    abstract getAuthProvider(): AuthProvider
    abstract onConnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onReconnect(user: HappyUser, provider: EIP1193Provider): Promise<void> | void
    abstract onDisconnect(): Promise<void> | void

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
            const userCredential = await signInWithPopup(
                firebaseAuth,
                this.getAuthProvider(),
                browserPopupRedirectResolver,
            )
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
                        ? [happyUser.address]
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
            await this.onDisconnect()
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

    private static async makeHappyUser(
        user: HappyUserDetails,
        addresses: `0x${string}`[],
        smartAccountAddress: `0x${string}`,
    ) {
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
        const maxRetries = 3
        for (let i = 0; i < maxRetries; i++) {
            try {
                // have to refresh JWT since web3auth fails if duplicate token is found
                const addresses = await web3AuthConnect(token)
                const accountAddress = await getKernelAccountAddress(addresses[0])
                if (!accountAddress) {
                    throw new AccountNotFoundError()
                }

                const user = await FirebaseConnector.makeHappyUser(partialUser, addresses, accountAddress)
                await setFirebaseSharedUser(user)
                return user
            } catch (e) {
                if (e instanceof Error && e.message.includes("not logged in yet")) {
                    // web3Auth can't connect, disconnect everything to allow user to retry
                    console.warn("Failed to connect. Clearing user", await getFirebaseAuthState())
                    return await this.disconnect()
                }

                console.warn(`Failed to connect to web3Auth, Retrying ${i + 1}/${maxRetries}`, e)
                await new Promise((resolve) => setTimeout(resolve, 3_000))
            }
        }

        // if it fails to connect, we should fully disconnect so the user can try again
        return this.disconnect()
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
