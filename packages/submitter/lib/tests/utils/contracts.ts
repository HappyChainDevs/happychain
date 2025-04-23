import { $ } from "bun"

function parseContractAddresses(results: string): string {
    return results
        .split("\n")
        .filter((a) => a.startsWith('  "'))
        .map((a) => a.replace(/,$/g, ""))
        .map((a) => {
            const [name, address] = a.split(": ")
            const nameStr = `${name.replace(/"/g, "").trim()}:`
            return `    \x1b[36m${nameStr.padEnd(32, " ")}\x1b[0m ${address.replace(/"/g, "")}`
        })
        .join("\n")
}

async function deployBoopContracts(): Promise<void> {
    console.log("🚧 Deploying Boop Contracts...")
    try {
        const results = await $`make -C ../../contracts deploy-boop`.text()
        console.log(parseContractAddresses(results))
        console.log("🚀 Boop Contracts Deployed")
    } catch (e) {
        throw new Error("Error deploying Boop contracts", { cause: e })
    }
}

async function deployMockContracts(): Promise<void> {
    console.log("🚧 Deploying Mock Contracts...")
    try {
        const results = await $`make -C ../../contracts deploy-mocks`.text()
        console.log(parseContractAddresses(results))
        console.log("🚀 Mock Contracts Deployed")
    } catch (e) {
        throw new Error("Error deploying Mock contracts", { cause: e })
    }
}

export const contracts = {
    deploy: async () => {
        console.log("")
        await deployBoopContracts()
        console.log("")
        await deployMockContracts()
        console.log("")
    },
}
