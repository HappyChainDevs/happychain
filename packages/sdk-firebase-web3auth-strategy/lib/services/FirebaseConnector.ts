import { type HappyUser, WalletType } from "@happychain/sdk-shared"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import { GoogleAuthProvider, type User, onAuthStateChanged, signInWithPopup } from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { AuthStates } from "../constants/enums"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3EIP1193Provider } from "../services/web3auth"
import { poll } from "../utils"
import { getState, getUser, setState, setUser } from "../workers/firebase.sw"
import { isConnected } from "../workers/web3auth.sw"

export class FirebaseConnector {
    public readonly type: string
    public readonly id: string
    public readonly name: string
    public readonly icon: string
    constructor(
        private opts: {
            name: string
            icon: string
            onConnect: (user: HappyUser, provider: EIP1193Provider) => void
            onReconnect: (user: HappyUser, provider: EIP1193Provider) => void
            onDisconnect: (user: undefined, provider: EIP1193Provider) => void
        },
    ) {
        this.id = `social:firebase:${opts.name}`.toLowerCase()
        this.type = WalletType.Social
        this.name = opts.name
        this.icon = opts.icon

        this.listenForAuthChange()
    }

    private connecting = false
    public async enable() {
        this.connecting = true
        return await new Promise((resolve, reject) => {
            signInWithPopup(firebaseAuth, new GoogleAuthProvider())
                .then(async (a) => {
                    const token = await this.fetchLoginTokenForUser(a.user)

                    const happyUser = await this.connectWithWeb3AuthNetwork(
                        FirebaseConnector.makeHappyUserPartial(a.user),
                        token,
                    )

                    await setUser(happyUser)
                    if (happyUser) {
                        await setState(AuthStates.Connected)
                        await this.opts.onConnect(happyUser, web3EIP1193Provider)
                        resolve(void 0)
                    } else {
                        reject()
                    }
                })
                .catch((e) => reject(e))
        })
    }

    public async disable() {
        await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
        await this.opts.onDisconnect(undefined, web3EIP1193Provider)
    }

    static makeHappyUserPartial(user: User) {
        return {
            // connection type
            type: WalletType.Social,
            provider: "firebase",
            // social details
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || "",
            ens: "", // filled in later, async, using a jotai atom subscription
            avatar: user.photoURL || "",
        } satisfies Omit<HappyUser, "address" | "addresses">
    }

    static makeHappyUser(user: ReturnType<typeof FirebaseConnector.makeHappyUserPartial>, addresses: `0x${string}`[]) {
        return {
            ...user,
            // web3 details
            address: addresses[0],
            addresses,
        } satisfies HappyUser
    }

    async connectWithWeb3AuthNetwork(
        partialUser: ReturnType<typeof FirebaseConnector.makeHappyUserPartial>,
        token: JWTLoginParams,
    ) {
        try {
            // have to refresh JWT since web3auth fails if duplicate token is found
            const addresses = await web3AuthConnect(token)
            const user = FirebaseConnector.makeHappyUser(partialUser, addresses)
            await setUser(user)
            return user
        } catch {
            // TODO: handle retry logic, and failure state
        }
    }

    async fetchLoginTokenForUser(user: User) {
        const token = await user.getIdTokenResult(true)

        if (!token.claims.sub) {
            throw new Error("No verified ID")
        }

        return {
            verifier: "supabase-1", // actually firebase tho
            verifierId: token.claims.sub,
            idToken: token.token,
        } satisfies JWTLoginParams
    }

    private listenForAuthChange() {
        onAuthStateChanged(firebaseAuth, async (_user) => {
            if (!_user) {
                await this.disable()
                return
            }

            if (this.connecting) {
                this.connecting = false
                return
            }

            const state = await getState()
            // connecting in another tab,
            if (state === AuthStates.Connecting) {
                await poll(async () => (await getState()) !== AuthStates.Connecting)

                const user = await getUser()
                if (user) {
                    await this.opts.onReconnect(user, web3EIP1193Provider)
                } else {
                    console.warn("unable to find user")
                }
                return
            }

            // web3 doesn't need this as it returns the current user instead of logging in
            // again anyways however this saves an extra lookup of the firebase JWT
            // if its not needed
            if (await isConnected()) {
                const user = await getUser()

                if (user) {
                    this.opts.onReconnect(user, web3EIP1193Provider)
                    return
                }

                // allow fall through to refresh JWT and log in again
                console.warn("failed to reconnect to network")
            }

            const token = await this.fetchLoginTokenForUser(_user)
            const happyUser = await this.connectWithWeb3AuthNetwork(
                FirebaseConnector.makeHappyUserPartial(_user),
                token,
            )

            if (happyUser) {
                this.opts.onReconnect(happyUser, web3EIP1193Provider)
            } else {
                console.warn("failed to connect")
            }
        })
    }
}
