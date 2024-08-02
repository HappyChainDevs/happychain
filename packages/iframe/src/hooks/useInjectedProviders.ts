import type {
	ConnectionProvider,
	EIP6963AnnounceProviderEvent,
	EIP6963ProviderDetail,
	HappyUser,
} from "@happychain/core";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storage } from "../services/storage";
import { AuthState, authStateAtom } from "../state/app";
import { setUserWithProvider } from "./useHappyAccount";

function isEip6963Event(evt: Event): evt is EIP6963AnnounceProviderEvent {
	return Boolean(
		typeof evt === "object" &&
			"detail" in evt &&
			typeof evt.detail === "object" &&
			evt.detail &&
			"info" in evt.detail &&
			"provider" in evt.detail
	);
}

type ProviderMap = Map<string, EIP6963ProviderDetail>;

export function useInjectedProviders(): ConnectionProvider[] {
	const setAuthState = useSetAtom(authStateAtom);
	// user injected extensions
	const [injectedProviders, setInjectedProviders] = useState<ProviderMap>(
		new Map()
	);

	const enable = useCallback(
		async (eip1193Provider: EIP6963ProviderDetail) => {
			const addresses = await eip1193Provider.provider.request({
				method: "eth_requestAccounts",
			});

			const user: HappyUser = {
				// connection type
				type: "injected",
				provider: eip1193Provider.info.rdns,
				// social details
				uid: addresses[0],
				email: "",
				name: `${addresses[0].slice(0, 6)}...${addresses[0].slice(-4)}`,
				ens: "", // TODO?
				avatar: `https://avatar.vercel.sh/${addresses[0]}?size=400`,
				// web3 details
				address: addresses[0],
				addresses,
			};

			setUserWithProvider(user, eip1193Provider.provider);
		},
		[]
	);

	const disable = useCallback(
		async (eip1193Provider: EIP6963ProviderDetail) => {
			const user = storage.get("cached-user");
			if (eip1193Provider.info.rdns === user?.provider) {
				setUserWithProvider(null, eip1193Provider.provider);
			}
		},
		[]
	);

	useEffect(() => {
		const callback = async (evt: Event) => {
			if (!isEip6963Event(evt)) return;
			if (
				// phantom seems to not connect from within iframe
				!("isPhantom" in evt.detail.provider) ||
				!evt.detail.provider.isPhantom
			) {
				setInjectedProviders(
					(map) => new Map(map.set(evt.detail.info.uuid, evt.detail))
				);
			}

			// autoconnect
			const user = storage.get("cached-user");
			if (user?.provider === evt.detail.info.rdns) {
				enable(evt.detail);
			}
		};

		window.addEventListener("eip6963:announceProvider", callback);
		return () =>
			window.removeEventListener("eip6963:announceProvider", callback);
	}, [enable]);

	useEffect(() => {
		window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
	}, []);

	const providers = useMemo(
		() =>
			Array.from(injectedProviders.values()).map((eip1193Provider) => {
				return {
					type: "injected",
					id: `injected:${eip1193Provider.info.rdns}`,
					name: eip1193Provider.info.name,
					icon: eip1193Provider.info.icon,
					enable: async () => {
						// will automatically disable loading state when user+provider are set
						setAuthState(AuthState.Loading);
						await enable(eip1193Provider);
					},
					disable: async () => {
						// will automatically disable loading state when user+provider are set
						setAuthState(AuthState.Loading);
						await disable(eip1193Provider);
					},
					getProvider: () => eip1193Provider.provider,
				};
			}),
		[enable, disable, setAuthState, injectedProviders]
	);

	return providers;
}
