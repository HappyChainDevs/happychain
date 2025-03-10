import { spawn } from "node:child_process"
import { sleep } from "@happy.tech/common"
import { ANVIL_PORT, BLOCK_GAS_LIMIT, CHAIN_ID, RPC_URL } from "./constants"

export async function startAnvil() {
    const anvil = spawn("anvil", [
        "--port",
        ANVIL_PORT.toString(),
        "--no-mining",
        "--chain-id",
        CHAIN_ID.toString(),
        "--gas-limit",
        BLOCK_GAS_LIMIT.toString(),
        "--steps-tracing"
    ])

    anvil.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`)
    })

    anvil.on("close", (code) => {
        console.log(`Anvil exited with code ${code}`)
    })

    return new Promise<void>((resolve) => {
        const checkRpc = async () => {
            try {
                const res = await fetch(RPC_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_chainId",
                        params: [],
                        id: 1,
                    }),
                })
                const data = await res.json()
                if (data?.result) {
                    console.log("Anvil Up")
                    resolve()
                    return
                }
            } catch (_) {
                // RPC not ready yet, retry after a short delay
            }
            setTimeout(checkRpc, 100)
        }
        checkRpc()
    })
}

export function killAnvil() {
    const killAnvil = spawn("pkill", ["-f", "anvil"])

    killAnvil.on("error", (error) => {
        console.error("Error executing pkill command:", error)
    })

    killAnvil.on("close", () => {
        console.log("Anvil processes terminated.")
    })
}

export async function mineBlock(quantity = 1) {
    let blocksAlreadyMined = 0

    while (blocksAlreadyMined < quantity) {
        await fetch(`http://localhost:${ANVIL_PORT}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "evm_mine",
                params: [],
                id: 2,
            }),
        })
        await sleep(500)
        blocksAlreadyMined++
    }
}
