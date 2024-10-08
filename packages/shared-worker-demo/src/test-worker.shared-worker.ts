// import "./buffer.polyfill"
// import type { SharedWorkerClient, SharedWorkerServer } from "@happychain/vite-plugin-shared-worker/runtime"
// import { tssLib } from "@toruslabs/tss-dkls-lib"
// import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
// import { COREKIT_STATUS, type JWTLoginParams, Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"

// const map = new Map<string, string>()
// const web3Auth = new Web3AuthMPCCoreKit({
//     web3AuthClientId: "BM0iAqMgZtUFmitDHVQYNbPIso22pL8eSNw-bYRGEOXRYAW4kdNKb8L3o0cnRIZ_qg2xaDg5PJhS4wXTLSn1QMA",
//     web3AuthNetwork: "sapphire_devnet",
//     manualSync: true,
//     tssLib: tssLib,
//     enableLogging: false,
//     storage: {
//         setItem(key: string, value: string) {
//             map.set(key, value)
//         },
//         getItem(key: string) {
//             return map.get(key) || null
//         },
//     },
// })
// web3Auth.init()

// const ethereumSigningProvider = new EthereumSigningProvider({
//     config: {
//         skipLookupNetwork: true,
//         chainConfig: {
//             chainNamespace: "eip155",
//             chainId: "0xd8",
//             rpcTarget: "https://happy-testnet-sepolia.rpc.caldera.xyz/http",
//             displayName: "happychain",
//             blockExplorerUrl: "https://happy-testnet-sepolia.explorer.caldera.xyz",
//             ticker: "ETH",
//             tickerName: "ETH",
//             decimals: 18,
//             wsTarget: "wss://happy-testnet-sepolia.rpc.caldera.xyz/ws",
//         },
//     },
// })
// ethereumSigningProvider.setupProvider(makeEthereumSigner(web3Auth))

// // let _ready = false
// // web3Auth.init()
// // .then(() => {
// //     _ready = true
// // })

// // function check(res) {
// //     if (_ready) res()
// //     setTimeout(() => {
// //         check(res)
// //     }, 500)
// // }

// // async function poll() {
// //     if (_ready) return
// //     return new Promise((res) => {
// //         check(res)
// //     })
// // }

// // wierd ts hacks to make types good and such
// declare const worker: SharedWorkerServer
// declare const client: SharedWorkerClient
// export const addMessageListener = client.addMessageListener

// ethereumSigningProvider.on("connect", (data) => worker.broadcast({ action: "connect", data }))
// ethereumSigningProvider.on("disconnect", (data) => worker.broadcast({ action: "disconnect", data }))
// ethereumSigningProvider.on("chainChanged", (data) => worker.broadcast({ action: "chainChanged", data }))
// ethereumSigningProvider.on("accountsChanged", (data) => worker.broadcast({ action: "accountsChanged", data }))

// export async function request({ method, params }: { method: string; params?: unknown[] }) {
//     return await ethereumSigningProvider.request({ method, params })
// }

// export async function connect(jwt: JWTLoginParams) {
//     await web3Auth.loginWithJWT(jwt)

//     if (web3Auth.status === COREKIT_STATUS.LOGGED_IN) {
//         await web3Auth.commitChanges()
//     }

//     const addresses = await ethereumSigningProvider.request({ method: "eth_accounts" })

//     if (
//         !addresses ||
//         !Array.isArray(addresses) ||
//         !addresses.every((a) => typeof a === "string" && a.startsWith("0x"))
//     ) {
//         throw new Error("[web3Auth] Failed to retrieve addresses")
//     }

//     return addresses as `0x${string}`[]
// }

// export async function disconnect() {
//     await web3Auth.logout()
// }
