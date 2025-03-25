import { spawn } from "node:child_process"
import { clearInterval } from "node:timers"
import { mineBlock } from "./anvil"

export async function deployMockContracts(): Promise<void> {
    const deployProcess = spawn("make", ["-C", "../../contracts", "deploy-mocks"])

    deployProcess.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`)
    })

    deployProcess.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`)
    })

    const interval = setInterval(() => {
        mineBlock()
    }, 1000)

    return new Promise((res, _) => {
        deployProcess.on("close", () => {
            clearInterval(interval)
            res()
        })
    })
}
