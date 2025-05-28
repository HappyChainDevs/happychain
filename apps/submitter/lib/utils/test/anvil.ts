import { ProxyMode, ProxyServer } from "@happy.tech/testing"
import { $, sleep } from "bun"
import { http, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil as anvilChain } from "viem/chains"
import { env } from "#lib/env"

// route all requests to Anvil through a proxy (this allows us to drop requests on demand)
const proxyServer = new ProxyServer(env.ANVIL_PORT, env.PROXY_PORT)
proxyServer.start().then(() => {
    console.log(`Proxy Server started on port ${env.PROXY_PORT}`)
    proxyServer.setMode(ProxyMode.Deterministic)
})
const anvilProxy = {
    ...anvilChain,
    rpcUrls: {
        default: {
            http: [`http://localhost:${env.PROXY_PORT}`],
        },
    },
}

const publicClient = createPublicClient({ chain: anvilProxy, transport: http() })

const walletClient = createWalletClient({
    account: privateKeyToAccount(env.EXECUTOR_KEYS[0]),
    chain: anvilProxy,
    transport: http(),
})

export async function waitBlocks(minBlocks = 1) {
    const startTime = Date.now()
    try {
        const start = await publicClient.getBlockNumber()
        while (true) {
            // empty tx to force mine a block
            if (env.AUTOMINE_TESTS) await walletClient.sendTransaction({ to: zeroAddress })
            const now = await publicClient.getBlockNumber()
            if (now - start >= minBlocks) return
            await sleep(500)
        }
    } catch {
        // ignore errors, Anvil might not be up
        if (Date.now() - startTime > 10000) throw new Error("Anvil not up after 10 seconds")
    }
}

const noop = () => {}

async function startAnvil() {
    const blockTime = env.AUTOMINE_TESTS ? "" : "--block-time 2"
    // As anvil is a long running process, we won't await.
    $`FOUNDRY_DISABLE_NIGHTLY_WARNING=true anvil ${blockTime}`.quiet().then(noop).catch(noop)
    await waitBlocks() // ensure anvil is up and running at least block 1
    console.log("\n⚒️ Anvil Started")
}

async function stopAnvil() {
    console.log("Stopping anvil...")
    try {
        await $`pkill -f anvil`
            .quiet()
            .then(() => {})
            .catch(() => {})
    } catch {}
    console.log("\n👋 Anvil Stopped")
}

export const anvil = {
    start: startAnvil,
    stop: stopAnvil,
}
