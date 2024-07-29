import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy";
import { useAtomValue, useSetAtom } from "jotai";

import { useEffect, useMemo } from "react";
import { AuthState, authStateAtom } from "../state/app";
import { setUserWithProvider, userAtom } from "./useHappyAccount";

export function useSocialProviders() {
	const setAuthState = useSetAtom(authStateAtom);
	const userValue = useAtomValue(userAtom);

	const { providers, onAuthChange } = useFirebaseWeb3AuthStrategy();

	useEffect(() => {
		onAuthChange((user, provider) => {
			// sync local user+provider state with internal plugin updates
			// not logged in and
			const loggingIn = Boolean(!userValue?.type && user);
			const loggedIn = userValue?.type === "social";
			if (loggingIn || loggedIn) {
				setUserWithProvider(user, provider);
			}
		});
	}, [onAuthChange, userValue]);

	const providersMemo = useMemo(
		() =>
			providers.map((provider) => ({
				...provider,
				enable: async () => {
					// will automatically disable loading state when user+provider are set
					setAuthState(AuthState.Loading);
					await provider.enable();
				},
				disable: async () => {
					// will automatically disable loading state when user+provider are set
					setAuthState(AuthState.Loading);
					await provider.disable();
				},
			})),
		[providers, setAuthState],
	);

	return providersMemo;
}
