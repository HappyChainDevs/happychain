import type { Optional } from "@happy.tech/common"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { toBytes, toDynamicLengthBytes } from "./bytes"

type OptionalHappyTxFields = "gasLimit" | "executeGasLimit" | "maxFeePerGas" | "submitterFee"
export function encodeHappyTx(tx: Optional<HappyTx, OptionalHappyTxFields>): `0x${string}` {
    // Static fields
    const accountHex = tx.account.slice(2)
    const gasLimitHex = toBytes(tx.gasLimit, 4)
    const validateGasLimitHex = toBytes(tx.validateGasLimit, 4)
    const executeGasLimitHex = toBytes(tx.executeGasLimit, 4)
    const validatePaymentGasLimitHex = toBytes(tx.validatePaymentGasLimit, 4)
    const destHex = tx.dest.slice(2)
    const paymasterHex = tx.paymaster.slice(2)
    const valueHex = toBytes(tx.value, 32)
    const nonceTrackHex = toBytes(tx.nonceTrack, 24)
    const nonceValueHex = toBytes(tx.nonceValue, 8)
    const maxFeePerGasHex = toBytes(tx.maxFeePerGas, 32)
    const submitterFeeHex = toBytes(tx.submitterFee, 32)

    // Dynamic fields with their 4-byte length prefixes
    const callDataHex = toDynamicLengthBytes(tx.callData.slice(2))
    const paymasterDataHex = toDynamicLengthBytes(tx.paymasterData.slice(2))
    const validatorDataHex = toDynamicLengthBytes(tx.validatorData.slice(2))
    const extraDataHex = toDynamicLengthBytes(tx.extraData.slice(2))

    // Concatenate all fields in order
    const encodedHex =
        // Static fields (196 bytes total)
        accountHex + // 20 bytes
        gasLimitHex + // 4 bytes
        validateGasLimitHex +
        executeGasLimitHex + // 4 bytes
        validatePaymentGasLimitHex +
        destHex + // 20 bytes
        paymasterHex + // 20 bytes
        valueHex + // 32 bytes
        nonceTrackHex + // 24 bytes
        nonceValueHex + // 8 bytes
        maxFeePerGasHex + // 32 bytes
        submitterFeeHex + // 32 bytes
        // Dynamic fields with length prefixes
        callDataHex +
        paymasterDataHex +
        validatorDataHex +
        extraDataHex

    return `0x${encodedHex}`
}
