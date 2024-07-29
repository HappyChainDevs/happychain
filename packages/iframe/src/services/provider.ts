import { defaultProvider as web3AuthEvmProvider } from "@happychain/firebase-web3auth-strategy";
import { atom } from "jotai";
import {
	type EIP1193Provider,
	createPublicClient,
	createWalletClient,
	custom,
} from "viem";

// TODO: move to a state file
const DEFAULT_PROVIDER = web3AuthEvmProvider as EIP1193Provider;

export const providerAtom = atom<EIP1193Provider>(DEFAULT_PROVIDER);
providerAtom.debugLabel = "providerAtom";

export const publicClientAtom = atom(
	createPublicClient({ transport: custom(DEFAULT_PROVIDER) }),
);
publicClientAtom.debugLabel = "publicClientAtom";

export const walletClientAtom = atom<AccountWalletClient | null>(null);
walletClientAtom.debugLabel = "walletClientAtom";

// utils
export const makeAccountWalletClient = (
	account: `0x${string}`,
	provider: Parameters<typeof custom>[0],
) => createWalletClient({ account, transport: custom(provider) });

export type AccountWalletClient = ReturnType<typeof makeAccountWalletClient>;
