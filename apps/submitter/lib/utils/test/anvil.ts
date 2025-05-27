import { ProxyMode, ProxyServer } from "@happy.tech/testing"
import { $, sleep } from "bun"
import { http, createPublicClient, createWalletClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil as anvilChain } from "viem/chains"
import { env, type Environment} from "#lib/env"

// Helper function to get test-specific ports
function getTestPorts(currentEnv: Environment): { anvilPort: number; proxyPort: number } {
    if (currentEnv.NODE_ENV === "test") {
        // Inside this block, currentEnv is narrowed to the 'test' specific type
        // which includes ANVIL_PORT and PROXY_PORT as numbers.
        return {
            anvilPort: currentEnv.ANVIL_PORT,
            proxyPort: currentEnv.PROXY_PORT,
        };
    } else {
        throw new Error(
            `ANVIL_PORT and PROXY_PORT are only available in the 'test' environment. Current NODE_ENV: ${currentEnv.NODE_ENV}`
        );
    }
}

// Initialize ports using the helper function
const { anvilPort: ANVIL_PORT_FOR_TEST, proxyPort: PROXY_PORT_FOR_TEST } = getTestPorts(env);

const proxyServer = new ProxyServer(ANVIL_PORT_FOR_TEST, PROXY_PORT_FOR_TEST)
proxyServer.start().then(() => {
    console.log(`Proxy Server started on port ${PROXY_PORT_FOR_TEST}`)
    proxyServer.setMode(ProxyMode.Deterministic)
})
const anvilProxy = {
    ...anvilChain,
    rpcUrls: {
        default: {
            http: [`http://localhost:${PROXY_PORT_FOR_TEST}`],
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
