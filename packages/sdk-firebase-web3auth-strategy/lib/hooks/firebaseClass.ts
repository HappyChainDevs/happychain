import { type HappyUser, WalletType } from "@happychain/sdk-shared"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import { GoogleAuthProvider, type User, onAuthStateChanged, signInWithPopup } from "firebase/auth"
import type { EIP1193Provider } from "viem"
import { googleLogo } from "../logos"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3EIP1193Provider } from "../services/web3auth"
import { isConnected } from "../services/web3auth.sw"
import { getState, getUser, setState, setUser } from "./firebaseAuth.sw"

enum AuthStates {
    Disconnected = "disconnected",
    Disconnecting = "disconnecting",
    Connected = "connected",
    Connecting = "connecting",
    Reconnecting = "re-connecting",
}

async function check(res: (value?: unknown) => void, condition: () => boolean | Promise<boolean>) {
    if (await condition()) res()
    setTimeout(() => check(res, condition), 500)
}

async function poll(condition: () => boolean | Promise<boolean>) {
    if (await condition()) return
    return new Promise((res) => {
        check(res, condition)
    })
}

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
                        // resolve({ user: happyUser, provider: web3EIP1193Provider })
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

    // private onConnectCallbacks = new Set<(user: HappyUser, provider: EIP1193Provider) => void>()
    // public onConnect(cb: (user: HappyUser, provider: EIP1193Provider) => void) {
    //     this.onConnectCallbacks.add(cb)
    //     return () => {
    //         this.onConnectCallbacks.delete(cb)
    //     }
    // }
    // private onReconnectCallbacks = new Set<(user: HappyUser, provider: EIP1193Provider) => void>()
    // public onReconnect(cb: (user: HappyUser, provider: EIP1193Provider) => void) {
    //     this.onReconnectCallbacks.add(cb)
    //     return () => {
    //         this.onReconnectCallbacks.delete(cb)
    //     }
    // }

    // private onDisconnectCallbacks = new Set<(user: undefined, provider: EIP1193Provider) => void>()
    // public onDisconnect(cb: (user: undefined, provider: EIP1193Provider) => void) {
    //     this.onDisconnectCallbacks.add(cb)
    //     return () => {
    //         this.onDisconnectCallbacks.delete(cb)
    //     }
    // }

    // private async emitOnConnect(user: HappyUser) {
    //     await poll(() => this.onConnectCallbacks.size > 0)
    //     console.log(`Emitting to ${this.onConnectCallbacks.size} Listeners - emitOnConnect`)
    //     for (const cb of this.onConnectCallbacks) {
    //         cb(user, web3EIP1193Provider)
    //     }
    // }

    // private async emitOnReconnect(user: HappyUser) {
    //     await poll(() => this.onReconnectCallbacks.size > 0)
    //     console.log(`Emitting to ${this.onReconnectCallbacks.size} Listeners - emitOnReconnect`)
    //     for (const cb of this.onReconnectCallbacks) {
    //         cb(user, web3EIP1193Provider)
    //     }
    // }

    // private async emitOnDisconnect() {
    //     await poll(() => this.onDisconnectCallbacks.size > 0)
    //     console.log(`Emitting to ${this.onDisconnectCallbacks.size} Listeners - emitOnDisconnect`)
    //     for (const cb of this.onDisconnectCallbacks) {
    //         cb(undefined, web3EIP1193Provider)
    //     }
    // }

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
            console.log("attempting")
            const addresses = await web3AuthConnect(token)
            console.log("success")
            const user = FirebaseConnector.makeHappyUser(partialUser, addresses)
            await setUser(user)
            return user
        } catch (e) {
            // if there is an issue, then lets just logout and clear everything
            console.error("onAuthChange", { e })
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
            console.log("auth state change", _user?.uid)

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
                    console.log("something weird happened connecting in another tab")
                }
                return
            }

            // web3 doesn't need this as it returns the current user instead of logging in again
            // however this saves an extra lookup of the firebase JWT if its not needed
            if (await isConnected()) {
                const user = await getUser()
                // console.log("Already Connected, aborting", user)
                // await this.emit(user)
                if (user) {
                    this.opts.onReconnect(user, web3EIP1193Provider)
                } else {
                    console.log("something weird happened re-connecting")
                }
                return
            }

            const token = await this.fetchLoginTokenForUser(_user)
            const happyUser = await this.connectWithWeb3AuthNetwork(
                FirebaseConnector.makeHappyUserPartial(_user),
                token,
            )

            if (happyUser) {
                this.opts.onReconnect(happyUser, web3EIP1193Provider)
            } else {
                console.log("something bad :( ")
            }
            // this.emit(happyUser)
        })
    }
}
