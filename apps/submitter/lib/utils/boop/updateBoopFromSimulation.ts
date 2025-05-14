import type { SimulateSuccess } from "#lib/handlers/simulate"
import type { Boop } from "#lib/types"

/**
 * Given a boop and a successful simulation output, returns an updated version of the boop, with the gas limits
 * and gas fees set according to the simulation.
 */
export function updateBoopFromSimulation(boop: Boop, simulation: SimulateSuccess): Boop {
    return {
        ...boop,
        gasLimit: simulation.gas,
        validateGasLimit: simulation.validateGas,
        validatePaymentGasLimit: simulation.validatePaymentGas,
        executeGasLimit: simulation.executeGas,
        maxFeePerGas: simulation.maxFeePerGas,
        submitterFee: simulation.submitterFee,
    }
}
