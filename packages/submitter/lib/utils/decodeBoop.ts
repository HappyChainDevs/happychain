import type { Boop } from "#lib/tmp/interface/Boop"
import { bytesToAddress, bytesToBigInt, getBytes, getDynamicLengthBytes } from "./bytes"

export function decodeBoop(encoded: `0x${string}`): Boop {
    const encodedBytes = encoded.slice(2)

    // Read static fields (204 bytes total)
    const account = bytesToAddress(getBytes(encodedBytes, 0, 20))
    const dest = bytesToAddress(getBytes(encodedBytes, 20, 20))
    const payer = bytesToAddress(getBytes(encodedBytes, 40, 20))
    const value = bytesToBigInt(getBytes(encodedBytes, 60, 32))
    const nonceTrack = bytesToBigInt(getBytes(encodedBytes, 92, 24))
    const nonceValue = bytesToBigInt(getBytes(encodedBytes, 116, 8))
    const maxFeePerGas = bytesToBigInt(getBytes(encodedBytes, 124, 32))
    const submitterFee = bytesToBigInt(getBytes(encodedBytes, 156, 32))
    const gasLimit = bytesToBigInt(getBytes(encodedBytes, 188, 4))
    const validateGasLimit = bytesToBigInt(getBytes(encodedBytes, 192, 4))
    const executeGasLimit = bytesToBigInt(getBytes(encodedBytes, 196, 4))
    const validatePaymentGasLimit = bytesToBigInt(getBytes(encodedBytes, 200, 4))

    // Read dynamic fields with their 4-byte length prefixes
    const [callData, callDataEndOffset] = getDynamicLengthBytes(encodedBytes, 204)
    const [validatorData, validatorDataEndOffset] = getDynamicLengthBytes(encodedBytes, callDataEndOffset)
    const [extraData] = getDynamicLengthBytes(encodedBytes, validatorDataEndOffset)

    return {
        account,
        gasLimit,
        validateGasLimit,
        executeGasLimit,
        validatePaymentGasLimit,
        dest,
        payer,
        value,
        nonceTrack,
        nonceValue,
        maxFeePerGas,
        submitterFee,
        callData: `0x${callData}`,
        validatorData: `0x${validatorData}`,
        extraData: `0x${extraData}`,
    }
}
