import type { EstimateGasInput } from "../tmp/interface/submitter_estimateGas"

export function encodeHappyTx(tx: EstimateGasInput["tx"]): `0x${string}` {
    // Static fields
    const accountHex = tx.account.slice(2)
    const gasLimitHex = (tx.gasLimit || "")?.toString(16).padStart(8, "0")
    const executeGasLimitHex = (tx.executeGasLimit || "")?.toString(16).padStart(8, "0")
    const destHex = tx.dest.slice(2)
    const paymasterHex = tx.paymaster.slice(2)
    const valueHex = tx.value.toString(16).padStart(64, "0")
    const nonceTrackHex = tx.nonceTrack.toString(16).padStart(48, "0") // 24 bytes
    const nonceValueHex = tx.nonceValue.toString(16).padStart(16, "0") // 8 bytes
    const maxFeePerGasHex = (tx.maxFeePerGas || "")?.toString(16).padStart(64, "0")
    const submitterFeeHex = (tx.submitterFee || "")?.toString(16).padStart(64, "0")

    // Dynamic fields with their 4-byte length prefixes
    const callDataHex = tx.callData.slice(2)
    const paymasterDataHex = tx.paymasterData.slice(2)
    const validatorDataHex = tx.validatorData.slice(2)
    const extraDataHex = tx.extraData.slice(2)

    const callDataLenHex = (callDataHex.length / 2).toString(16).padStart(8, "0")
    const paymasterDataLenHex = (paymasterDataHex.length / 2).toString(16).padStart(8, "0")
    const validatorDataLenHex = (validatorDataHex.length / 2).toString(16).padStart(8, "0")
    const extraDataLenHex = (extraDataHex.length / 2).toString(16).padStart(8, "0")

    // Concatenate all fields in order
    const encodedHex =
        // Static fields (196 bytes total)
        accountHex + // 20 bytes
        gasLimitHex + // 4 bytes
        executeGasLimitHex + // 4 bytes
        destHex + // 20 bytes
        paymasterHex + // 20 bytes
        valueHex + // 32 bytes
        nonceTrackHex + // 24 bytes
        nonceValueHex + // 8 bytes
        maxFeePerGasHex + // 32 bytes
        submitterFeeHex + // 32 bytes
        // Dynamic fields with length prefixes
        callDataLenHex +
        callDataHex +
        paymasterDataLenHex +
        paymasterDataHex +
        validatorDataLenHex +
        validatorDataHex +
        extraDataLenHex +
        extraDataHex

    return `0x${encodedHex}`
}
