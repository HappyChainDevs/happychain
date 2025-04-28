import { tssLib } from "@toruslabs/tss-dkls-lib"
import { Web3AuthMPCCoreKit } from "@web3auth/mpc-core-kit"
import { web3AuthWorkerStorage } from "./storage"

const web3AuthOptions = {
    web3AuthClientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK,
    manualSync: true,
    tssLib: tssLib,
    enableLogging: false,
    storage: web3AuthWorkerStorage,
}

export const web3Auth = new Web3AuthMPCCoreKit(web3AuthOptions)
