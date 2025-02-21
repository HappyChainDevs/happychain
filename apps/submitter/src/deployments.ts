import { abis as happyAAAbis, deployment as happyAADeployment } from "@happy.tech/contracts/happy-aa/anvil"
import { abis as mockAbis, deployment as mockDeployment } from "@happy.tech/contracts/mocks/anvil"

// Export everything centralized here so that we can easily switch from anvil
export const deployment = {
    ...happyAADeployment,
    ...mockDeployment,
}

export const abis = {
    ...happyAAAbis,
    ...mockAbis,
}

export default { abis, deployment }
