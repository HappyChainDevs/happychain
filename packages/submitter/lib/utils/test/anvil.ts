import { $, sleep } from "bun"
import { http, createPublicClient } from "viem"
import { anvil as anvilChain } from "viem/chains"

const publicClient = createPublicClient({ chain: anvilChain, transport: http() })

export async function waitBlocks(minBlocks = 1) {
    const start = await publicClient.getBlockNumber()
    while (true) {
        const now = await publicClient.getBlockNumber()
        if (now - start >= minBlocks) return
        await sleep(500)
    }
}

const noop = () => {}

async function startAnvil() {
    // As anvil is a long running process, we won't await.
    $`FOUNDRY_DISABLE_NIGHTLY_WARNING=true anvil --block-time 2`.quiet().then(noop).catch(noop)
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
