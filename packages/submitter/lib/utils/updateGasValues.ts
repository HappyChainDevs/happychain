import { decodeBoop } from "./decodeBoop"
import { encodeBoop } from "./encodeBoop"
import type { SubmitSimulateResponseOk } from "./simulation-interfaces"

/**
 * Does not modify self paying, or explicitly set gas limits, however if gas limits are omitted
 * this will set them to the values returned by the simulation.
 */
export function updateGasValues(args: `0x${string}`, result: SubmitSimulateResponseOk["result"]): `0x${string}` {
    // Update gas limits for the encoded tx if they where previously 0 and boop is not self-paying
    const decoded = decodeBoop(args)
    const isSelfPaying = decoded.payer === decoded.account
    if (isSelfPaying) return args // no changes needed

    if (!decoded.gasLimit && result.gas) {
        decoded.gasLimit = BigInt(result.gas)
    }
    if (!decoded.validateGasLimit && result.validateGas) {
        decoded.validateGasLimit = BigInt(result.validateGas)
    }
    if (!decoded.validatePaymentGasLimit && result.paymentValidateGas) {
        decoded.validatePaymentGasLimit = BigInt(result.paymentValidateGas)
    }
    if (!decoded.executeGasLimit && result.executeGas) {
        decoded.executeGasLimit = BigInt(result.executeGas)
    }

    return encodeBoop(decoded)
}
