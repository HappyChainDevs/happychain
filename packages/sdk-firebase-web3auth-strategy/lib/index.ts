import { web3AuthInit, web3EIP1193Provider } from "./services/web3auth"

export async function init() {
    return await web3AuthInit()
}

export const defaultProvider = web3EIP1193Provider

export { useFirebaseWeb3AuthStrategy } from "./hooks/useFirebaseWeb3AuthStrategy"
