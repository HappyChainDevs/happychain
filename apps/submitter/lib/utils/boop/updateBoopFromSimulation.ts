import type { SimulateSuccess } from "#lib/handlers/simulate"
import type { Boop } from "#lib/types"

// Exported for SDK use, internally we use `mutateBoopGasFromSimulation` in simulate.ts.
/**
 * Given a boop and a successful simulation output, returns an updated version of the boop,
 * with the gas limits and gas fees set according to the simulation.
 */
export function updateBoopFromSimulation(boop: Boop, simulation: SimulateSuccess): Boop {
    return {
        ...boop,
        gasLimit: boop.gasLimit || simulation.gas,
        validateGasLimit: boop.validateGasLimit || simulation.validateGas,
        validatePaymentGasLimit: boop.validatePaymentGasLimit || simulation.validatePaymentGas,
        executeGasLimit: boop.executeGasLimit || simulation.executeGas,
        maxFeePerGas: boop.maxFeePerGas || simulation.maxFeePerGas,
        submitterFee: boop.submitterFee || simulation.submitterFee,
    }
}
