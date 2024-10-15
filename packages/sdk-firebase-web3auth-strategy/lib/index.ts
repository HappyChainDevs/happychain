import { googleLogo } from "./logos"
import { FirebaseConnector } from "./services/FirebaseConnector"
import { web3AuthInit, web3EIP1193Provider } from "./services/web3auth"

export { FirebaseConnector }
export const configs = {
    google: {
        name: "Google",
        icon: googleLogo,
    },
}

export const init = web3AuthInit
export const defaultProvider = web3EIP1193Provider
