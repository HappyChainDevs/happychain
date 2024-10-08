// /// <reference lib="WebWorker" />
// import "./buffer.polyfill"
// import { tssLib } from "@toruslabs/tss-dkls-lib"
// import { type IStorage, Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit"

// const sharedWorkerGlobal: SharedWorkerGlobalScope = self as unknown as SharedWorkerGlobalScope
// //bundling other node libraries
// import { workerKid } from "./workerkid"

// const ports: MessagePort[] = []

// sharedWorkerGlobal.onconnect = (e: MessageEvent) => {
//     const [port] = e.ports
//     ports.push(port)

//     const map = new Map<string, string>()
//     const web3Auth = new Web3AuthMPCCoreKit({
//         web3AuthClientId: "BM0iAqMgZtUFmitDHVQYNbPIso22pL8eSNw-bYRGEOXRYAW4kdNKb8L3o0cnRIZ_qg2xaDg5PJhS4wXTLSn1QMA",
//         web3AuthNetwork: "sapphire_devnet",
//         manualSync: true, // This is the recommended approach
//         tssLib: tssLib,
//         enableLogging: false,
//         storage: {
//             setItem(key: string, value: string) {
//                 map.set(key, value)
//             },
//             getItem(key: string) {
//                 return map.get(key) || null
//             },
//         },
//     })

//     port.onmessage = () => {
//         // throw new Error("oh no!")
//         port.postMessage(workerKid())
//     }
// }

// sharedWorkerGlobal.onerror = (e) => {
//     for (const port of ports) {
//         port.postMessage(`FAIL - ${e.toString()}`)
//     }
// }
