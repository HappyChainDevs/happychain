import { tssLib } from "@toruslabs/tss-dkls-lib"
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit"
import { deploymentVar } from "#src/env"
import { web3AuthWorkerStorage } from "./storage"

type Web3AuthNetwork = "sapphire_devnet" | "sapphire_mainnet"

const web3AuthOptions = {
    web3AuthClientId: deploymentVar("VITE_WEB3AUTH_CLIENT_ID"),
    web3AuthNetwork: deploymentVar("VITE_WEB3AUTH_NETWORK") as Web3AuthNetwork,
    manualSync: true,
    tssLib: tssLib,
    enableLogging: false,
    storage: web3AuthWorkerStorage,
}

export const web3Auth = new Web3AuthMPCCoreKit(web3AuthOptions)
