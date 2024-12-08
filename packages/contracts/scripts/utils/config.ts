import type { Hex } from "viem"

const privateKey = process.env.PRIVATE_KEY_LOCAL as Hex
const bundlerRpc = process.env.BUNDLER_LOCAL
const rpcURL = process.env.RPC_LOCAL

if (!privateKey || !bundlerRpc || !rpcURL) {
    const missing = [!privateKey && "PRIVATE_KEY_LOCAL", !bundlerRpc && "BUNDLER_LOCAL", !rpcURL && "RPC_LOCAL"].filter(
        Boolean,
    )
    throw new Error(`Missing environment variables: ${missing.join(", ")}`)
}

export { privateKey, bundlerRpc, rpcURL }
