import { useCallback, useEffect } from "react"

import { atomWithCompare, useIsHydrated } from "@happychain/common"
import type { HappyUser } from "@happychain/sdk-shared"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import { type Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth"
import { useAtom, useSetAtom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { EIP1193Provider } from "viem"

import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3AuthEvmProvider } from "../services/web3auth"

export type SignInProvider = "google"

const cachedFirebaseAuthStateAtom = atomWithStorage("firebase-auth", "unauthenticated", undefined, { getOnInit: true })

const firebaseAuthUserAtom = atomWithCompare<HappyUser | undefined>(undefined, (a, b) => a?.uid === b?.uid)

async function signInWithGoogle(auth: Auth) {
    const googleProvider = new GoogleAuthProvider()
    return await signInWithPopup(auth, googleProvider).then((a) => a.user)
}

function useSignIn(auth: Auth) {
    const setAuthState = useSetAtom(cachedFirebaseAuthStateAtom)
    const signIn = useCallback(
        async (provider: SignInProvider) => {
            setAuthState("loading")
            switch (provider) {
                case "google":
                    await signInWithGoogle(auth)
                    return
                default:
                    setAuthState("unauthenticated")
                    throw new Error(`Unknown provider: ${provider}`)
            }
        },
        [auth, setAuthState],
    )

    return { signIn }
}

function useSignOut(auth: Auth) {
    const signOut = useCallback(async () => {
        await auth.signOut()
    }, [auth])
    return { signOut }
}

function useOnAuthChange(auth: Auth) {
    const [internalAuthState, setInternalAuthState] = useAtom(cachedFirebaseAuthStateAtom)
    const [userAuth, setUserAuth] = useAtom(firebaseAuthUserAtom)
    const { signOut } = useSignOut(auth)
    useEffect(() => {
        return onAuthStateChanged(firebaseAuth, async (_user) => {
            if (!userAuth?.uid && !_user?.uid) {
                // wasn't logged in and still not. nothing to do
                return
            }
            console.warn({ _user: _user?.uid, prev: userAuth?.uid })
            if (!_user?.uid) {
                console.warn("disconnecting, but why", window.location.href)
                await web3AuthDisconnect()

                setUserAuth(undefined)
                setInternalAuthState("unauthenticated")
                return
            }
            try {
                const token = await _user.getIdTokenResult(true)

                if (!token.claims.sub) {
                    throw new Error("No verified ID")
                }
                const idTokenLoginParams = {
                    verifier: "supabase-1", // actually firebase tho
                    verifierId: token.claims.sub,
                    idToken: token.token,
                } satisfies JWTLoginParams

                const addresses = await web3AuthConnect(idTokenLoginParams)

                const nextUser: HappyUser = {
                    // connection type
                    type: "social",
                    provider: "firebase",
                    // social details
                    uid: _user.uid,
                    email: _user.email || "",
                    name: _user.displayName || "",
                    ens: "",
                    avatar: _user.photoURL || "",
                    // web3 details
                    address: addresses[0],
                    addresses,
                }

                setUserAuth(nextUser)
                setInternalAuthState("authenticated")
            } catch {
                // if there is an issue, then lets just logout and clear everything
                signOut()
            }
        })
    }, [userAuth, setUserAuth, setInternalAuthState, signOut])

    const isHydrated = useIsHydrated()
    const onAuthChange = useCallback(
        (callback: (user: HappyUser | undefined, provider: EIP1193Provider) => void) => {
            if (!isHydrated) {
                return
            }

            if (internalAuthState === "authenticated" && userAuth) {
                console.log("AUTHENTICATED", userAuth)
                return callback(userAuth, web3AuthEvmProvider)
            }

            if (internalAuthState === "unauthenticated" && !userAuth) {
                console.log("UNAUTHENTICATED", userAuth)
                return callback(userAuth, web3AuthEvmProvider)
            }
        },
        [isHydrated, userAuth, internalAuthState],
    )

    return { onAuthChange }
}

export function useFirebaseAuth(auth: Auth) {
    const { signIn } = useSignIn(auth)
    const { signOut } = useSignOut(auth)
    const { onAuthChange } = useOnAuthChange(auth)

    return { signIn, signOut, onAuthChange }
}
