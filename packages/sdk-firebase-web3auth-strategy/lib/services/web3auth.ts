import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider";
import {
	COREKIT_STATUS,
	type IdTokenLoginParams,
	Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import { type EIP1193Provider, createWalletClient, custom } from "viem";

/***
 * Setup
 */
const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;

export const web3Auth = new Web3AuthMPCCoreKit({
	web3AuthClientId,
	web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK,
	setupProviderOnInit: false, // needed to skip the provider setup
	manualSync: true, // This is the recommended approach
	uxMode: "popup",
});

const ethereumSigningProvider = new EthereumSigningProvider({
	config: {
		chainConfig: {
			chainNamespace: import.meta.env.VITE_WEB3AUTH_CHAIN_NAMESPACE,
			chainId: import.meta.env.VITE_WEB3AUTH_CHAIN_ID,
			rpcTarget: import.meta.env.VITE_WEB3AUTH_CHAIN_RPC,
			displayName: import.meta.env.VITE_WEB3AUTH_CHAIN_DISPLAYNAME,
			blockExplorerUrl: import.meta.env
				.VITE_WEB3AUTH_CHAIN_BLOCK_EXPLORER,
			ticker: import.meta.env.VITE_WEB3AUTH_CHAIN_TOKEN_SYMBOL,
			tickerName: import.meta.env.VITE_WEB3AUTH_CHAIN_TOKEN_NAME,
		},
	},
});
ethereumSigningProvider.setupProvider(web3Auth);
export const web3AuthEvmProvider = ethereumSigningProvider as EIP1193Provider;

let lastToken = "";
export async function web3AuthConnect(jwt: IdTokenLoginParams) {
	if (jwt.idToken !== lastToken) {
		lastToken = jwt.idToken;
		await web3Auth.loginWithJWT(jwt);
	}

	if (web3Auth.status === COREKIT_STATUS.LOGGED_IN) {
		await web3Auth.commitChanges(); // Needed for new accounts
	}

	const addressClient = createWalletClient({
		transport: custom(web3AuthEvmProvider),
	});
	const addresses = await addressClient.getAddresses();
	return addresses;
}

export async function web3AuthDisconnect() {
	await web3Auth.logout();
}
