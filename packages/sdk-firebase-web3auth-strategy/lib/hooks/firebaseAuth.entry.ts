// import { type HappyUser, WalletType } from "@happychain/sdk-shared"
// import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
// import { GoogleAuthProvider, type User, onAuthStateChanged, signInWithPopup } from "firebase/auth"
// import type { EIP1193Provider } from "viem"
// import { firebaseAuth } from "../services/firebase"
// import { web3AuthConnect, web3AuthDisconnect, web3EIP1193Provider } from "../services/web3auth"
// import { isConnected } from "../services/web3auth.sw"
// import { getState, getUser, setState, setUser } from "./firebaseAuth.sw"

// enum AuthStates {
//     Disconnected = "disconnected",
//     Disconnecting = "disconnecting",
//     Connected = "connected",
//     Connecting = "connecting",
//     Reconnecting = "re-connecting",
// }

// /**
//  * Signing has to be local so that firebase can open the popup using signInWithPopup
//  * this cannot happen in a shared worker context
//  */
// export async function signIn(provider: "google"): Promise<{ user: HappyUser; provider: EIP1193Provider }> {
//     //     if (store.get(cachedFirebaseAuthStateAtom) !== AuthStates.Disconnected)
//     //         throw new Error(`Incorrect Auth State: ${store.get(cachedFirebaseAuthStateAtom)}`)

//     console.log("signin request")
//     // store.set(cachedFirebaseAuthStateAtom, AuthStates.Connecting)
//     setState(AuthStates.Connecting)

//     try {
//         switch (provider) {
//             case "google":
//                 return await new Promise<{ user: HappyUser; provider: EIP1193Provider }>((resolve, reject) => {
//                     signInWithPopup(firebaseAuth, new GoogleAuthProvider())
//                         .then(async (a) => {
//                             const token = await fetchLoginTokenForUser(a.user)
//                             const happyUser = await connectWithWeb3AuthNetwork(makeHappyUserPartial(a.user), token)

//                             await setUser(happyUser)
//                             if (happyUser) {
//                                 await setState(AuthStates.Connected)
//                                 console.log("returning", { ...happyUser })
//                                 resolve({ user: happyUser, provider: web3EIP1193Provider })
//                             } else {
//                                 reject()
//                             }
//                         })
//                         .catch((e) => reject(e))
//                 })
//             default:
//                 console.log("1111")
//                 setState(AuthStates.Disconnected)
//                 throw new Error(`Unknown provider: ${provider}`)
//         }
//     } catch (e) {
//         setState(AuthStates.Disconnected)
//         throw e
//     }
// }

// export async function signOut() {
//     await firebaseAuth.signOut()
// }

// const messageCallbacks = new Set<(user: HappyUser | undefined, provider: EIP1193Provider) => void>()

// export function onAuthChange(cb: (user: HappyUser | undefined, provider: EIP1193Provider) => void) {
//     messageCallbacks.add(cb)
// }

// async function emit(user: HappyUser | undefined) {
//     // unclear why at this point these aren't registered immediately
//     await poll(() => messageCallbacks.size > 0)

//     for (const cb of messageCallbacks) {
//         cb(user, web3EIP1193Provider)
//     }
// }
// async function check(res: (value?: unknown) => void, condition: () => boolean | Promise<boolean>) {
//     if (await condition()) res()
//     setTimeout(() => check(res, condition), 500)
// }

// async function poll(condition: () => boolean | Promise<boolean>) {
//     if (await condition()) return
//     return new Promise((res) => {
//         check(res, condition)
//     })
// }

// const connected = false
// // sync user info to shared context
// onAuthStateChanged(firebaseAuth, async (_user) => {
//     console.log("auth state change", _user?.uid)
//     const state = await getState()
//     if (state === AuthStates.Connecting) {
//         await poll(async () => (await getState()) !== AuthStates.Connecting)
//         emit(await getUser())
//         return
//     }

//     if (!_user) {
//         await Promise.allSettled([firebaseAuth.signOut(), web3AuthDisconnect()])
//         emit(undefined)
//         return
//     }

//     // web3 doesn't need this as it returns the current user instead of logging in again
//     // however this saves an extra lookup of the firebase JWT if its not needed
//     if (await isConnected()) {
//         const user = await getUser()
//         console.log("Already Connected, aborting", user)
//         emit(user)
//         return
//     }

//     const token = await fetchLoginTokenForUser(_user)
//     const happyUser = await connectWithWeb3AuthNetwork(makeHappyUserPartial(_user), token)
//     emit(happyUser)
// })

// async function connectWithWeb3AuthNetwork(partialUser: ReturnType<typeof makeHappyUserPartial>, token: JWTLoginParams) {
//     try {
//         // have to refresh JWT since web3auth fails if duplicate token is found
//         console.log("attempting")
//         const addresses = await web3AuthConnect(token)
//         console.log("success")
//         const user = makeHappyUser(partialUser, addresses)
//         await setUser(user)
//         return user
//     } catch (e) {
//         // if there is an issue, then lets just logout and clear everything
//         console.error("onAuthChange", { e })
//     }
// }

// async function fetchLoginTokenForUser(user: User) {
//     const token = await user.getIdTokenResult(true)

//     if (!token.claims.sub) {
//         throw new Error("No verified ID")
//     }

//     return {
//         verifier: "supabase-1", // actually firebase tho
//         verifierId: token.claims.sub,
//         idToken: token.token,
//     } satisfies JWTLoginParams
// }

// function makeHappyUserPartial(user: User) {
//     return {
//         // connection type
//         type: WalletType.Social,
//         provider: "firebase",
//         // social details
//         uid: user.uid,
//         email: user.email || "",
//         name: user.displayName || "",
//         ens: "", // filled in later, async, using a jotai atom subscription
//         avatar: user.photoURL || "",
//     } satisfies Omit<HappyUser, "address" | "addresses">
// }

// function makeHappyUser(user: ReturnType<typeof makeHappyUserPartial>, addresses: `0x${string}`[]) {
//     return {
//         ...user,
//         // web3 details
//         address: addresses[0],
//         addresses,
//     } satisfies HappyUser
// }
