import { spawn } from "node:child_process"
import { sleep } from "@happy.tech/common"
import { ANVIL_PORT, CHAIN_ID } from "./constants"

export function startAnvil() {
    const anvil = spawn("anvil", ["--port", ANVIL_PORT.toString(), "--no-mining", "--chain-id", CHAIN_ID.toString()])

    anvil.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`)
    })

    anvil.on("close", (code) => {
        console.log(`Anvil exited with code ${code}`)
    })

    return new Promise<void>((resolve) => {
        const checkRpc = async () => {
            try {
                const res = await fetch(`http://localhost:${ANVIL_PORT}`, {
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

export async function mineBlock() {
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
    await sleep(1000)
}
