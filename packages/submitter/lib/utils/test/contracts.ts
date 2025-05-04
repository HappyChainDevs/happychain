import { $ } from "bun"
import { deployment } from "#lib/env"

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
        const { deployment: newDeployment } = await import("@happy.tech/contracts/boop/anvil")

        // The following overrides are necessary, as `#lib/env` gets loaded before, with the previous addresses.

        // @ts-ignore
        deployment.EntryPoint = newDeployment.EntryPoint
        // @ts-ignore
        deployment.HappyAccountImpl = newDeployment.HappyAccountImpl
        // @ts-ignore
        deployment.HappyAccountBeaconProxyFactory = newDeployment.HappyAccountBeaconProxyFactory
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

        // We don't override the deployed contracts here as we assume that this will change relatively rarely.
        // In case it changes, it's just necessary to redeploy before running the tests (or rerun the tests).
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
