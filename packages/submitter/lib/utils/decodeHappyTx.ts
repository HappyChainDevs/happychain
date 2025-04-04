import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { bytesToAddress, bytesToBigInt, getBytes, getDynamicLengthBytes } from "./bytes"

export function decodeHappyTx(encoded: `0x${string}`): HappyTx {
    const encodedBytes = encoded.slice(2)

    // Read static fields (204 bytes total)
    const account = bytesToAddress(getBytes(encodedBytes, 0, 20))
    const gasLimit = bytesToBigInt(getBytes(encodedBytes, 20, 4))
    const validateGasLimit = bytesToBigInt(getBytes(encodedBytes, 24, 4))
    const executeGasLimit = bytesToBigInt(getBytes(encodedBytes, 28, 4))
    const validatePaymentGasLimit = bytesToBigInt(getBytes(encodedBytes, 32, 4))
    const dest = bytesToAddress(getBytes(encodedBytes, 36, 20))
    const paymaster = bytesToAddress(getBytes(encodedBytes, 56, 20))
    const value = bytesToBigInt(getBytes(encodedBytes, 76, 32))
    const nonceTrack = bytesToBigInt(getBytes(encodedBytes, 108, 24))
    const nonceValue = bytesToBigInt(getBytes(encodedBytes, 132, 8))
    const maxFeePerGas = bytesToBigInt(getBytes(encodedBytes, 140, 32))
    const submitterFee = bytesToBigInt(getBytes(encodedBytes, 172, 32))

    // Read dynamic fields with their 4-byte length prefixes
    const [callData, callDataEndOffset] = getDynamicLengthBytes(encodedBytes, 204)
    const [paymasterData, paymasterDataEndOffset] = getDynamicLengthBytes(encodedBytes, callDataEndOffset)
    const [validatorData, validatorDataEndOffset] = getDynamicLengthBytes(encodedBytes, paymasterDataEndOffset)
    const [extraData] = getDynamicLengthBytes(encodedBytes, validatorDataEndOffset)

    return {
        account,
        gasLimit,
        validateGasLimit,
        executeGasLimit,
        validatePaymentGasLimit,
        dest,
        paymaster,
        value,
        nonceTrack,
        nonceValue,
        maxFeePerGas,
        submitterFee,
        callData: `0x${callData}`,
        paymasterData: `0x${paymasterData}`,
        validatorData: `0x${validatorData}`,
        extraData: `0x${extraData}`,
    }
}
