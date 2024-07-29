import { web3Auth, web3AuthEvmProvider } from "./services/web3auth";

export async function init() {
	return await web3Auth.init();
}

export const defaultProvider = web3AuthEvmProvider;

export { useFirebaseWeb3AuthStrategy } from "./hooks/useFirebaseWeb3AuthStrategy";
