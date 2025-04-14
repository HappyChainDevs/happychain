import { LogTag } from "@happy.tech/common"
import {
    type ConnectionProvider,
    type HappyUser,
    type Msgs,
    type MsgsFromApp,
    type MsgsFromIframe,
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
import { AccountNotFoundError } from "permissionless"
import type { EIP1193Provider } from "viem"
import { getKernelAccountAddress } from "#src/state/kernelAccount"
import { getPermissions } from "#src/state/permissions"
import { getAppURL } from "#src/utils/appURL"
import { logger } from "#src/utils/logger.ts"
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

    abstract getAuthProvider(): FirebaseAuthProvider
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
                browserPopupRedirectResolver, // primarily for mobile, might not be needed for mobile
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

    private async fetchLoginTokenForUser(user: FirebaseAuthUser) {
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

    private authChangeCallbackRunning = false
    /**
     * Firebase internally maintains a "pending promise" to track popup-based sign-in flows
     * (e.g., `signInWithPopup`). If multiple concurrent auth-related flows occur — such as
     * when `onAuthStateChanged` fires while `signInWithPopup` is still resolving —
     * Firebase may throw the error:
     *
     *   _INTERNAL ASSERTION FAILED: Pending promise was never set_
     *
     * This error occurs due to race conditions between Firebase's redirect resolver state
     * and overlapping login attempts.
     *
     * To prevent this, this listener uses an `authChangeCallbackRunning` guard to ensure
     * only one instance of the callback executes at a time. This protects against re-entrant
     * calls or concurrent auth resolution events.
     */
    private listenForAuthChange() {
        onAuthStateChanged(firebaseAuth, async (_user) => {
            if (this.authChangeCallbackRunning) {
                logger.warn(LogTag.ALL, "authChangeCallbackRunning: skipping callback execution")
                return
            }
            this.authChangeCallbackRunning = true
            console.warn("authChangeCallbackRunning: skipping callback execution")

            try {
                if (!_user) {
                    if ((await getFirebaseAuthState()) !== FirebaseAuthState.Disconnecting) {
                        await this.disconnect()
                    }
                    return
                }

                if (this.instanceIsConnecting) {
                    this.instanceIsConnecting = false
                    return
                }

                if (await isWeb3AuthConnected()) {
                    const user = await getFirebaseSharedUser()
                    if (user) {
                        await this.onReconnect(user, web3AuthEIP1193Provider)
                        return
                    }
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
                    logger.warn(LogTag.IFRAME, "failed to connect")
                }
            } finally {
                this.authChangeCallbackRunning = false
                logger.info(LogTag.IFRAME, "[AuthState] END authChangeCallback")
            }
        })
    }
}
