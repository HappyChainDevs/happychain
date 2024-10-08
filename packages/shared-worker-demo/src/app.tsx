import "./buffer.polyfill"
import { useEffect, useState } from "preact/hooks"
import viteLogo from "/vite.svg"
import preactLogo from "./assets/preact.svg"
import "./app.css"

// @ts-ignore
import { double } from "./testing.shared-worker"
// import ugh from "./testing.shared-worker?sharedworker"
// new ugh()
// setTimeout(async () => {
// try {
//     // console.error(await request({ method: "eth_accounts" }))

// addMessageListener((n) => {
//     if (!(n && typeof n === "object" && "action" in n && "data" in n)) {
//         console.log({ n })
//         return
//     }

//     switch (n.action) {
//         case "connect":
//             console.log({ connect: n.data })
//             break

//         case "disconnect":
//             console.log({ disconnect: n.data })
//             break

//         case "chainChanged":
//             console.log({ chainChanged: n.data })
//             break

//         case "accountsChanged":
//             console.log({ accountsChanged: n.data })
//             break
//     }
// })

// } catch (e) {
//     console.error(e)
// }
// }, 500)

// console.log(await getNumber())

// import tssLib from "@toruslabs/tss-dkls-lib"
// import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
// import { Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"
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

//             wsTarget: undefined, // unsupported currently
//         },
//     },
// })

// ethereumSigningProvider.setupProvider(makeEthereumSigner(web3Auth))

// setTimeout(async () => {
//     console.log({
//         what: await ethereumSigningProvider.request({ method: "eth_chainId" }),
//     })
// }, 3_000)

// const worker = new SharedWorker(new URL("./worker.ts", import.meta.url), { type: "module" })
// worker.onerror = () => {
//     console.log("errors")
// }
// worker.port.onmessageerror = () => {
//     console.log("errors")
// }
// worker.port.onmessage = (e) => {
//     console.log({ fromWorker: e.data })
// }
// worker.port.postMessage("hey")

export function App() {
    const [count, setCount] = useState(0)
    useEffect(() => {
        const what = async () => {
            console.log("before")
            console.log(await double(5))
            console.log("after")
        }
        what()
    }, [])

    return (
        <>
            <div>
                <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
                    <img src={viteLogo} class="logo" alt="Vite logo" />
                </a>
                <a href="https://preactjs.com" target="_blank" rel="noreferrer">
                    <img src={preactLogo} class="logo preact" alt="Preact logo" />
                </a>
            </div>
            <h1>Vite + Preact</h1>
            <div class="card">
                <button type="button" onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/app.tsx</code> and save to test HMR
                </p>
            </div>
            <p>
                Check out{" "}
                <a
                    href="https://preactjs.com/guide/v10/getting-started#create-a-vite-powered-preact-app"
                    target="_blank"
                    rel="noreferrer"
                >
                    create-preact
                </a>
                , the official Preact + Vite starter
            </p>
            <p class="read-the-docs">Click on the Vite and Preact logos to learn more</p>
        </>
    )
}
