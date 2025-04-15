import { $ } from "bun"
import { waitBlocks } from "./anvil"

async function deployBoopContracts(): Promise<void> {
    console.log("Deploying Boop Contracts...")
    try {
        const results = await $`make -C ../../contracts deploy-boop`.text()
        console.log(
            results
                .split("\n")
                .filter((a) => a.startsWith('  "'))
                .map((a) => a.replace(/,$/g, ""))
                .join("\n"),
        )
        await waitBlocks(1)
        console.log("Boop Contracts Deployed")
    } catch (e) {
        throw new Error("Error deploying Boop contracts", { cause: e })
    }
}

async function deployMockContracts(): Promise<void> {
    console.log("Deploying Mock Contracts...")
    try {
        const results = await $`make -C ../../contracts deploy-mocks`.text()
        console.log(
            results
                .split("\n")
                .filter((a) => a.startsWith('  "'))
                .map((a) => a.replace(/,$/g, ""))
                .join("\n"),
        )
        await waitBlocks(1)
        console.log("Mock Contracts Deployed")
    } catch (e) {
        throw new Error("Error deploying Mock contracts", { cause: e })
    }
}

export const contracts = {
    deploy: async () => {
        await deployBoopContracts()
        await deployMockContracts()
    },
}
