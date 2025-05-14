import { type Hex, bytesToNumber, getBytes, toBytes } from "@happy.tech/common"

/**
 * Support Extension Types
 */
export enum ExtensionType {
    Validator = 0,
    Executor = 1,
}

/**
 * Key types used to describe extraData values.
 */
export enum ExtraDataKey {
    Validator = "0x1",
    Executor = "0x2",
}

/**
 * ExtraData is a record of key-value pairs where the key is a hex string and the value is a string, bigint, or number.
 * The keys are 3-byte hex strings and the values are encoded into hex strings of variable length.
 */
export type ExtraData<T extends Hex | bigint | number | undefined = Hex | bigint | number | undefined> = Record<Hex, T>

function serializeExtraData(key: Hex, value: string | bigint | number | undefined): string {
    const data = (value ?? "").toString(16).replace(/^0x/, "")
    const length = Math.ceil(data.length / 2)
    const keyBytes = toBytes(key, 3)
    const lengthBytes = toBytes(length, 3)
    const dataBytes = toBytes(data, length)
    return `${keyBytes}${lengthBytes}${dataBytes}`
}

/**
 * Converts a record of extraData key-value pairs into a hex string.
 * Each key-value pair is serialized with a 3-byte key, a 3-byte length prefix, and the value itself.
 * The resulting hex string is prefixed with '0x'.
 */
export function encodeExtraData(data: ExtraData): Hex {
    if (!data || !Object.keys(data)?.length) return "0x"

    const raw = Object.entries(data)
        .map(([key, value]) => serializeExtraData(key as Hex, value))
        .join("")

    return `0x${raw}`
}

/**
 * Decodes a hex string of extraData into a record of key-value pairs.
 * Each key is 3 bytes is a 3 byte hex string. `0x001` and the value will also be a hex string.
 */
export function decodeExtraData(encoded: Hex): ExtraData<Hex> {
    const encodedBytes = encoded.replace(/^0x/, "")
    const data: ExtraData<Hex> = {}
    let offset = 0

    while (offset < encodedBytes.length) {
        const key = getBytes(encodedBytes, offset, 3)
        if (!key) break
        const length = bytesToNumber(getBytes(encodedBytes, offset + 3, 3))
        const value = getBytes(encodedBytes, offset + 6, length)
        data[`0x${key}`] = `0x${value}`
        offset += 6 + length
    }

    return data
}
