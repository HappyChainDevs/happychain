import { tssLib } from "@toruslabs/tss-dkls-lib"
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
import { COREKIT_STATUS, type JWTLoginParams, Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"
import type { EIP1193Provider } from "viem"
import { config } from "./config"

/***
 * Setup
 */
const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID

export const web3Auth = new Web3AuthMPCCoreKit({
    web3AuthClientId,
    web3AuthNetwork: config.web3AuthNetwork,
    manualSync: true, // This is the recommended approach
    tssLib: tssLib,
    storage: window.localStorage,
})

const ethereumSigningProvider = new EthereumSigningProvider({
    config: {
        chainConfig: {
            chainNamespace: config.web3AuthChainNamespace,
            chainId: config.chainId,
            rpcTarget: config.rpcUrls[0],
            displayName: config.chainName,
            blockExplorerUrl: config.blockExplorerUrls?.[0],
            ticker: config.nativeCurrency.symbol,
            tickerName: config.nativeCurrency.name,
            decimals: config.nativeCurrency.decimals,

            wsTarget: undefined, // unsupported currently
        },
    },
})
ethereumSigningProvider.setupProvider(makeEthereumSigner(web3Auth))
export const web3AuthEvmProvider = ethereumSigningProvider as EIP1193Provider

let lastToken = ""
export async function web3AuthConnect(jwt: JWTLoginParams): Promise<`0x${string}`[]> {
    if (jwt.idToken !== lastToken) {
        lastToken = jwt.idToken
        await web3Auth.loginWithJWT(jwt)
    }

    if (web3Auth.status === COREKIT_STATUS.LOGGED_IN) {
        await web3Auth.commitChanges() // Needed for new accounts
    }

    const addresses = await ethereumSigningProvider.request({
        method: "eth_accounts",
    })

    if (
        !addresses ||
        !Array.isArray(addresses) ||
        !addresses.every((a) => typeof a === "string" && a.startsWith("0x"))
    ) {
        throw new Error("[web3Auth] Failed to retrieve addresses")
    }

    return addresses as `0x${string}`[]
}

export async function web3AuthDisconnect() {
    await web3Auth.logout()
}
