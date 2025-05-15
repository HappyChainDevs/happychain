import type { Address, HTTPString } from "@happy.tech/common"
import { deployment } from "@happy.tech/contracts/boop/sepolia"

// Defaults to HappyChain Sepolia, can be configured in consuming app via new `BoopClient({ ...options })`.
const SUBMITTER_URL = import.meta.env.SUBMITTER_URL ?? "https://submitter.happy.tech"
const RPC_URL = import.meta.env.RPC_URL ?? "https://rpc.testnet.happy.tech"
const ENTRYPOINT = import.meta.env.ENTRYPOINT ?? deployment.EntryPoint

export const env = { SUBMITTER_URL, RPC_URL, ENTRYPOINT } as {
    SUBMITTER_URL: HTTPString
    RPC_URL: HTTPString
    ENTRYPOINT: Address
}
