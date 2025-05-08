import type { Address, HTTPString } from "@happy.tech/common"
import { deployment as anvilDeployment } from "@happy.tech/contracts/boop/anvil"
import { deployment as happySepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"

const { SUBMITTER_URL, RPC_URL, ENTRYPOINT } = import.meta.env

// biome-ignore format: clarity
export const env = {
    SUBMITTER_URL: SUBMITTER_URL ?? "https://submitter.happy.tech",
    RPC_URL: RPC_URL ?? "https://rpc.testnet.happy.tech",
    ENTRYPOINT: ENTRYPOINT ??
        RPC_URL === "http://localhost:8545"
            ? anvilDeployment.EntryPoint
            : happySepoliaDeployment.EntryPoint
} as {
    SUBMITTER_URL: HTTPString
    RPC_URL: HTTPString
    ENTRYPOINT: Address
}
