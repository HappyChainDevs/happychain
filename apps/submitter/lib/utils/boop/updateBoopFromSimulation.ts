import type { SimulateSuccess } from "#lib/handlers/simulate"
import { traceFunction } from "#lib/telemetry/traces"
import type { Boop } from "#lib/types"

/**
 * Given a boop and a successful simulation output, returns an updated version of the boop,
 * with the gas limits and gas fees set according to the simulation.
 */
function updateBoopFromSimulation(boop: Boop, simulation: SimulateSuccess): Boop {
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

const tracedUpdateBoopFromSimulation = traceFunction(updateBoopFromSimulation)

export { tracedUpdateBoopFromSimulation as updateBoopFromSimulation }
