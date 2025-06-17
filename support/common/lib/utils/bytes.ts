import type { Address } from "viem/accounts"
import { getAddress } from "viem/utils"

/**
 * Converts a number or bigint to a hex string of {bytes} bytes
 * e.g. toBytes(255, 1) => 'ff'
 *
 * This truncates the string if it is too long
 * e.g. toBytes('ffff', 1) => 'ff'
 */
export function toBytes(data: string | bigint | number | undefined, bytes: number): string {
    if (!bytes) return ""
    if (!data) return "0".padStart(bytes * 2, "0")
    const full = data
        .toString(16)
        .replace(/^0x/, "")
        .padStart(bytes * 2, "0")

    const trimmed = getBytes(full, 0, bytes)

    if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
        throw new Error(`Invalid bytes: ${trimmed}`)
    }

    return trimmed
}

/**
 * Returns a copy of the data prefixed with its length in bytes (we assume hex encoding, so dividing the length of
 * {@link data} by 2 after optionally stripping "0x"), encoded over {@link lengthBytes} bytes (defaults to 4).
 *
 * e.g. toDynamicLengthBytes('ff')  => '00000001ff'
 * e.g. toDynamicLengthBytes('fff') => '000000020fff'
 */
export function toDynamicLengthBytes(data: string | number | bigint | undefined, lengthBytes = 4): string {
    if (!data) return `${toBytes(0, lengthBytes)}${toBytes(data, 0)}`
    const input = data.toString(16).replace(/^0x/, "")
    const byteLength = Math.ceil(input.length / 2)
    return `${toBytes(byteLength, lengthBytes)}${toBytes(input, byteLength)}`
}

/**
 * slices {length} bytes from {raw} starting at {offset}
 */
export function getBytes(raw: string, offset: number, length: number): string {
    const start = offset * 2
    const end = start + length * 2
    return raw.replace(/^0x/, "").slice(start, end)
}

/**
 * starting at {offset} it reads the next 4 bytes as a number
 * and returns the next {number} bytes as a string
 * @param raw raw hex string
 * @param startOffset byte which to start reading
 * @returns [hexData, endOffset]
 */
export function getDynamicLengthBytes(raw: string, startOffset: number, lengthBytes = 4): [string, number] {
    const callDataLen = bytesToNumber(getBytes(raw, startOffset, lengthBytes))
    const data = getBytes(raw, startOffset + lengthBytes, callDataLen)
    const endOffset = startOffset + callDataLen + lengthBytes
    return [data, endOffset]
}

export function bytesToHex(bytes: string | bigint | number | undefined, minLength = 0): Address {
    const length = Math.ceil((bytes?.toString(16).length || 0) / 2)
    return `0x${toBytes(bytes?.toString(16), Math.max(length, minLength))}`
}

/**
 * Prefixes a raw bytestring with 0x and checksums it to a valid Address
 */
export function bytesToAddress(bytes: string | bigint | number | undefined): Address {
    const safeBytes = (() => {
        try {
            return toBytes(bytes, 20)
        } catch {
            // invalid bytes, but will let getAddress throw
            return bytes
        }
    })()
    return getAddress(`0x${safeBytes}`)
}

/**
 * Converts a raw hex string to a bigint (not 0x prefixed)
 * e.g. bytesToBigInt('ff') => 255n
 */
export function bytesToBigInt(bytes: string | bigint | number | undefined): bigint {
    if (!bytes) return 0n
    return BigInt(`0x${bytes.toString(16).replace(/^0x/, "")}`)
}

/**
 * Converts a raw hex string to a number (not 0x prefixed)
 * e.g. bytesToNumber('ff') => 255
 */
export function bytesToNumber(bytes: string | bigint | number | undefined): number {
    if (!bytes) return 0
    return Number(`0x${bytes.toString(16).replace(/^0x/, "")}`)
}
