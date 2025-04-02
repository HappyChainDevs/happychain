import { abis as happyAAAbis, deployment as happyAADeployment } from "@happy.tech/contracts/happy-aa/anvil"
import { abis as mockAbis, deployment as mockDeployment } from "@happy.tech/contracts/mocks/anvil"

// Import and re-export contracts here for a simple way to switch between deployments throughout the app
// TODO: move addresses to env file
export const deployment = {
    ...happyAADeployment,
    ...mockDeployment,
}

export const abis = {
    ...happyAAAbis,
    ...mockAbis,
}

export default { abis, deployment }
