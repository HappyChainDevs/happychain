import type { Hex } from "@happy.tech/common"
import { toBytes, toDynamicLengthBytes } from "@happy.tech/common"
import type { BoopWithOptionalFields } from "#lib/types"

/**
 * Encodes a Boop into the encoded {@link Hex} form for onchain submission.
 */
export function encodeBoop_noTrace(boop: BoopWithOptionalFields): Hex {
    // Static fields
    const accountHex = boop.account.slice(2)
    const destHex = boop.dest.slice(2)
    const payerHex = boop.payer.slice(2)

    const valueHex = toBytes(boop.value, 32)
    const nonceTrackHex = toBytes(boop.nonceTrack, 24)
    const nonceValueHex = toBytes(boop.nonceValue, 8)
    const maxFeePerGasHex = toBytes(boop.maxFeePerGas, 32)
    const submitterFeeHex = toBytes(boop.submitterFee, 32)
    const gasLimitHex = toBytes(boop.gasLimit, 4)
    const validateGasLimitHex = toBytes(boop.validateGasLimit, 4)
    const validatePaymentGasLimitHex = toBytes(boop.validatePaymentGasLimit, 4)
    const executeGasLimitHex = toBytes(boop.executeGasLimit, 4)

    // Dynamic fields with their 4-byte length prefixes
    const callDataHex = toDynamicLengthBytes(boop.callData.slice(2))
    const validatorDataHex = toDynamicLengthBytes(boop.validatorData.slice(2))
    const extraDataHex = toDynamicLengthBytes(boop.extraData.slice(2))

    // Concatenate all fields in order
    const encodedHex =
        accountHex + // 20 bytes
        destHex + // 20 bytes
        payerHex + // 20 bytes
        valueHex + // 32 bytes
        nonceTrackHex + // 24 bytes
        nonceValueHex + // 8 bytes
        maxFeePerGasHex + // 32 bytes
        submitterFeeHex + // 32 bytes
        gasLimitHex + // 4 bytes
        validateGasLimitHex + // 4 bytes
        validatePaymentGasLimitHex + // 4 bytes
        executeGasLimitHex + // 4 bytes
        callDataHex +
        validatorDataHex +
        extraDataHex

    return `0x${encodedHex}`
}
