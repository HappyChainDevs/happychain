import type { Address, HTTPString } from "@happy.tech/common"
import { deployment as stagingDeployment } from "@happy.tech/contracts/boop-staging/sepolia"
import { deployment as anvilDeployment } from "@happy.tech/contracts/boop/anvil"
import { deployment as happyChainSepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"

// Defaults to HappyChain Sepolia, can be configured in consuming app via new `BoopClient({ ...options })`.
const SUBMITTER_URL = import.meta.env.SUBMITTER_URL ?? "https://submitter.happy.tech"
const RPC_URL = import.meta.env.RPC_URL ?? "https://rpc.testnet.happy.tech/http"

const ENTRYPOINT = (() => {
    if (import.meta.env.ENTRYPOINT) return import.meta.env.ENTRYPOINT
    const chainId = Number(import.meta.env.CHAIN_ID)
    if (!chainId) return happyChainSepoliaDeployment
    const deployment =
        chainId === 216
            ? import.meta.env.USE_STAGING_CONTRACTS
                ? stagingDeployment
                : happyChainSepoliaDeployment
            : chainId === 31337
              ? anvilDeployment
              : happyChainSepoliaDeployment
    return deployment.EntryPoint
})()

export const env = { SUBMITTER_URL, RPC_URL, ENTRYPOINT } as {
    SUBMITTER_URL: HTTPString
    RPC_URL: HTTPString
    ENTRYPOINT: Address
}
