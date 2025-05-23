import type { Address, HTTPString } from "@happy.tech/common"
import { deployment as anvilDeployment } from "@happy.tech/contracts/boop/anvil"
import { deployment as happySepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"

const {
    HAPPY_SUBMITTER_URL = "https://submitter.happy.tech",
    HAPPY_RPC_HTTP_URL = "https://rpc.testnet.happy.tech",
    HAPPY_ENTRYPOINT,
} = import.meta.env

// biome-ignore format: clarity
export const env = {
    SUBMITTER_URL: HAPPY_SUBMITTER_URL,
    RPC_URL: HAPPY_RPC_HTTP_URL,
    ENTRYPOINT: HAPPY_ENTRYPOINT ??
        HAPPY_RPC_HTTP_URL === "http://localhost:8545"
            ? anvilDeployment.EntryPoint
            : happySepoliaDeployment.EntryPoint
} as {
    SUBMITTER_URL: HTTPString
    RPC_URL: HTTPString
    ENTRYPOINT: Address
}
