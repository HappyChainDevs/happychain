import { atomWithCompare } from "@happychain/common"
import { type HappyUser, WalletType } from "@happychain/sdk-shared"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth"
import { getDefaultStore, useAtomValue } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { useCallback } from "react"
import type { EIP1193Provider } from "viem"
import { firebaseAuth } from "../services/firebase"
import { web3AuthConnect, web3AuthDisconnect, web3EIP1193Provider } from "../services/web3auth"

export type SignInProvider = "google"

const store = getDefaultStore()
const cachedFirebaseAuthStateAtom = atomWithStorage("firebase-auth", "unauthenticated", undefined, { getOnInit: true })
const firebaseAuthUserAtom = atomWithCompare<HappyUser | undefined>(undefined, (a, b) => a?.uid === b?.uid)

async function signIn(provider: SignInProvider) {
    store.set(cachedFirebaseAuthStateAtom, "loading")
    switch (provider) {
        case "google":
            await signInWithPopup(firebaseAuth, new GoogleAuthProvider()).then((a) => a.user)
            return
        default:
            store.set(cachedFirebaseAuthStateAtom, "unauthenticated")
            throw new Error(`Unknown provider: ${provider}`)
    }
}

async function signOut() {
    await firebaseAuth.signOut()
}

onAuthStateChanged(firebaseAuth, async (_user) => {
    const userAuth = store.get(firebaseAuthUserAtom)

    if (!_user?.uid && !firebaseAuth?.currentUser) {
        if (userAuth?.uid) {
            await web3AuthDisconnect()
            store.set(firebaseAuthUserAtom, undefined)
        }
        store.set(cachedFirebaseAuthStateAtom, "unauthenticated")
        return
    }

    if (!_user || _user?.uid === userAuth?.uid) {
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
            type: WalletType.Social,
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

        store.set(firebaseAuthUserAtom, nextUser)
        store.set(cachedFirebaseAuthStateAtom, "authenticated")
    } catch (e) {
        // if there is an issue, then lets just logout and clear everything
        console.error({ e })
        signOut()
    }
})

function useOnAuthChange() {
    const userAuth = useAtomValue(firebaseAuthUserAtom)
    // call callback everytime userAuth changes
    const onAuthChange = useCallback(
        (callback: (user: HappyUser | undefined, provider: EIP1193Provider) => void) => {
            const logInEvent = store.get(cachedFirebaseAuthStateAtom) === "authenticated" && userAuth
            const logOutEvent = store.get(cachedFirebaseAuthStateAtom) === "unauthenticated" && !userAuth

            if (logInEvent || logOutEvent) {
                return callback(userAuth, web3EIP1193Provider)
            }
        },
        [userAuth],
    )

    return { onAuthChange }
}

export function useFirebaseAuth() {
    const { onAuthChange } = useOnAuthChange()

    return { signIn, signOut, onAuthChange }
}
