import type { Address, Hex } from "viem"
import type { HappyTx } from "#src/tmp/interface/HappyTx"

export function decodeHappyTx(encoded: Hex): HappyTx {
    const encodedBytes = encoded.slice(2)
    let offset = 0

    // Read static fields (196 bytes total)
    const account = `0x${encodedBytes.slice(offset, offset + 40)}` as Address
    offset += 40 // 20 bytes

    const gasLimit = Number(`0x${encodedBytes.slice(offset, offset + 8)}`)
    offset += 8 // 4 bytes

    const executeGasLimit = Number(`0x${encodedBytes.slice(offset, offset + 8)}`)
    offset += 8 // 4 bytes

    const dest = `0x${encodedBytes.slice(offset, offset + 40)}` as Address
    offset += 40 // 20 bytes

    const paymaster = `0x${encodedBytes.slice(offset, offset + 40)}` as Address
    offset += 40 // 20 bytes

    const value = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`)
    offset += 64 // 32 bytes

    const nonceTrack = BigInt(`0x${encodedBytes.slice(offset, offset + 48)}`)
    offset += 48 // 24 bytes

    const nonceValue = BigInt(`0x${encodedBytes.slice(offset, offset + 16)}`)
    offset += 16 // 8 bytes

    const maxFeePerGas = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`)
    offset += 64 // 32 bytes

    const submitterFee = BigInt(`0x${encodedBytes.slice(offset, offset + 64)}`)
    offset += 64 // 32 bytes

    // Read dynamic fields with their 4-byte length prefixes
    const callDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16)
    offset += 8
    const callData: Hex = `0x${encodedBytes.slice(offset, offset + callDataLen * 2)}`
    offset += callDataLen * 2

    const paymasterDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16)
    offset += 8
    const paymasterData: Hex = `0x${encodedBytes.slice(offset, offset + paymasterDataLen * 2)}`
    offset += paymasterDataLen * 2

    const validatorDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16)
    offset += 8
    const validatorData: Hex = `0x${encodedBytes.slice(offset, offset + validatorDataLen * 2)}`
    offset += validatorDataLen * 2

    const extraDataLen = Number.parseInt(encodedBytes.slice(offset, offset + 8), 16)
    offset += 8
    const extraData: Hex = `0x${encodedBytes.slice(offset, offset + extraDataLen * 2)}`

    return {
        account,
        gasLimit,
        executeGasLimit,
        dest,
        paymaster,
        value,
        nonceTrack,
        nonceValue,
        maxFeePerGas,
        submitterFee,
        callData,
        paymasterData,
        validatorData,
        extraData,
    }
}
