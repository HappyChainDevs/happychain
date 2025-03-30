import { abis as happyAAAbis, deployment as happyAADeployment } from "@happy.tech/contracts/happy-aa/anvil"
import { abis as mockAbis, deployment as mockDeployment } from "@happy.tech/contracts/mocks/anvil"

// TODO remove mocks later
// TODO this will need to be configurable to enable reuse beyond the HappyChain deployment
// Import and re-export contracts here for a simple way to switch between deployments throughout the app
export const deployment = {
    ...happyAADeployment,
    ...mockDeployment,
}

export const abis = {
    ...happyAAAbis,
    ...mockAbis,
}

export default { abis, deployment }
