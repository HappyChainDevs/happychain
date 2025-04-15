import { $, sleep } from "bun"
import { http, createPublicClient } from "viem"
import { localhost } from "viem/chains"
const publicClient = createPublicClient({ chain: localhost, transport: http() })

export async function waitBlocks(minBlocks = 1) {
    const start = await publicClient.getBlockNumber()
    while (true) {
        const now = await publicClient.getBlockNumber()
        if (now - start >= minBlocks) return
        await sleep(500)
    }
}

async function startAnvil() {
    $`FOUNDRY_DISABLE_NIGHTLY_WARNING=true anvil --chain-id 1337 --block-time 2`
        .quiet()
        .then(() => {})
        .catch(() => {})
    await waitBlocks(1)
    console.log("Anvil Started")
}

async function stopAnvil() {
    try {
        await $`pkill -f anvil`
            .quiet()
            .then(() => {})
            .catch(() => {})
    } catch {}
    console.log("Anvil Stopped")
}

export const anvil = {
    start: startAnvil,
    stop: stopAnvil,
    wait: waitBlocks,
}
