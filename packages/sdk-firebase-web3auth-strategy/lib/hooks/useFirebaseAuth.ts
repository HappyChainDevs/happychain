import { useIsHydrated } from "@happychain/common";
import type { HappyUser } from "@happychain/core";
import type { IdTokenLoginParams } from "@web3auth/mpc-core-kit";
import {
	type Auth,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
} from "firebase/auth";
import { atom, useAtom, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useCallback, useEffect } from "react";
import type { EIP1193Provider } from "viem";
import { firebaseAuth } from "../services/firebase";
import { connect, disconnect, web3AuthEvmProvider } from "../services/web3auth";

export type SignInProvider = "google";

const internalAuthStateAtom = atomWithStorage(
	"firebase-auth",
	"unauthenticated",
);

const firebaseAuthStateAtom = atom<{
	user: HappyUser | null;
	provider: EIP1193Provider;
}>({
	user: null,
	provider: web3AuthEvmProvider,
});

async function signInWithGoogle(auth: Auth) {
	const googleProvider = new GoogleAuthProvider();
	return await signInWithPopup(auth, googleProvider).then((a) => a.user);
}

function useSignIn(auth: Auth) {
	const setAuthState = useSetAtom(internalAuthStateAtom);
	const signIn = useCallback(
		async (provider: SignInProvider) => {
			setAuthState("loading");
			switch (provider) {
				case "google":
					await signInWithGoogle(auth);
					return;
				default:
					setAuthState("unauthenticated");
					throw new Error(`Unknown provider: ${provider}`);
			}
		},
		[auth, setAuthState],
	);

	return { signIn };
}

function useSignOut(auth: Auth) {
	const signOut = useCallback(async () => {
		await auth.signOut();
	}, [auth]);
	return { signOut };
}

function useOnAuthChange() {
	const [internalAuthState, setInternalAuthState] = useAtom(
		internalAuthStateAtom,
	);
	const [userAuth, setUserAuth] = useAtom(firebaseAuthStateAtom);
	useEffect(() => {
		onAuthStateChanged(firebaseAuth, async (_user) => {
			if (!_user?.uid) {
				await disconnect();

				setUserAuth({
					user: null,
					provider: web3AuthEvmProvider,
				});
				setInternalAuthState("unauthenticated");
				return;
			}

			const token = await _user.getIdTokenResult(true);

			if (!token.claims.sub) {
				throw new Error("No verified ID");
			}
			const idTokenLoginParams = {
				verifier: "supabase-1", // actually firebase tho
				verifierId: token.claims.sub,
				idToken: token.token,
			} satisfies IdTokenLoginParams;

			const addresses = await connect(idTokenLoginParams);

			const nextUser: HappyUser = {
				// connection type
				type: "social",
				provider: "google",
				// social details
				uid: _user.uid,
				email: _user.email || "",
				name: _user.displayName || "",
				ens: "", // TODO?
				avatar: _user.photoURL || "",
				// web3 details
				address: addresses[0],
				addresses,
			};

			setUserAuth({
				user: nextUser,
				provider: web3AuthEvmProvider,
			});
			setInternalAuthState("authenticated");
		});
	}, [setUserAuth, setInternalAuthState]);

	const isHydrated = useIsHydrated();
	const onAuthChange = useCallback(
		(callback: (user: HappyUser | null, provider: EIP1193Provider) => void) => {
			if (!isHydrated) {
				return;
			}

			if (internalAuthState === "authenticated" && userAuth.user) {
				return callback(userAuth.user, userAuth.provider);
			}

			if (internalAuthState === "unauthenticated" && !userAuth.user) {
				return callback(userAuth.user, userAuth.provider);
			}
		},
		[isHydrated, userAuth, internalAuthState],
	);

	return { onAuthChange };
}

export function useFirebaseAuth(auth: Auth) {
	const { signIn } = useSignIn(auth);
	const { signOut } = useSignOut(auth);
	const { onAuthChange } = useOnAuthChange();

	return { signIn, signOut, onAuthChange };
}
