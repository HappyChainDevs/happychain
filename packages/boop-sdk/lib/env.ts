import type { Address, HTTPString } from "@happy.tech/common"
import { deployment as anvilDeployment } from "@happy.tech/contracts/boop/anvil"
import { deployment as happySepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"

const { SUBMITTER_URL, RPC_URL, ENTRYPOINT } = import.meta.env

const missed = new Set<string>()
if (!SUBMITTER_URL) missed.add("SUBMITTER_URL")
if (!RPC_URL) missed.add("RPC_URL")
if (missed.size > 0) throw new Error(`Missing environment variables: ${Array.from(missed).join(", ")}`)

const anvilUrl = "http://localhost:8545"
const sepoliaUrl = "https://rpc.testnet.happy.tech"

if (!ENTRYPOINT && RPC_URL !== anvilUrl && RPC_URL !== sepoliaUrl)
    console.warn(
        `Unknown RPC URL ${RPC_URL} but ENTRYPOINT is not set — defaulting to HappyChain Sepolia deployment address`,
    )

// biome-ignore format: clarity
const entryPointToUse = ENTRYPOINT ??
    RPC_URL === anvilUrl
        ? anvilDeployment.EntryPoint
        : happySepoliaDeployment.EntryPoint

export const env = {
    SUBMITTER_URL,
    RPC_URL,
    ENTRYPOINT: entryPointToUse,
} as {
    SUBMITTER_URL: HTTPString
    RPC_URL: HTTPString
    ENTRYPOINT: Address
}
