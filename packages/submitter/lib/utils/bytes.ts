import type { Address } from "viem/accounts"
import { getAddress } from "viem/utils"

/**
 * Converts a number or bigint to a hex string of {bytes} bytes
 * e.g. toBytes(255, 1) => 'ff'
 */
export function toBytes(data: string | bigint | number | undefined, bytes: number): string {
    if (!bytes) return ""
    if (!data) return "0".padStart(bytes * 2, "0")
    return data.toString(16).padStart(bytes * 2, "0")
}

/**
 * Prefixes the data with a 4 byte length, and returns the full string
 * e.g. toDynamicLengthBytes('ff')  => '00000001ff'
 * e.g. toDynamicLengthBytes('fff') => '000000020fff'
 */
export function toDynamicLengthBytes(data: string): string {
    const byteLength = Math.ceil(data.length / 2)
    return `${toBytes(byteLength, 4)}${toBytes(data, byteLength)}`
}

/**
 * slices {length} bytes from {raw} starting at {offset}
 */
export function getBytes(raw: string, offset: number, length: number): string {
    const offset_ = offset * 2
    return raw.slice(offset_, offset_ + length * 2)
}

/**
 * starting at {offset} it reads the next 4 bytes as a number
 * and returns the next {number} bytes as a string
 * @param raw raw hex string
 * @param startOffset byte which to start reading
 * @returns [hexData, endOffset]
 */
export function getDynamicLengthBytes(raw: string, startOffset: number): [string, number] {
    const callDataLen = bytesToNumber(getBytes(raw, startOffset, 4))
    const data = getBytes(raw, startOffset + 4, callDataLen)
    const endOffset = startOffset + callDataLen + 4
    return [data, endOffset]
}

/**
 * Prefixes a raw bytestring with 0x and checksums it to a valid Address
 */
export function bytesToAddress(bytes: string): Address {
    return getAddress(`0x${bytes}`)
}

/**
 * Converts a raw hex string to a bigint (not 0x prefixed)
 * e.g. bytesToBigInt('ff') => 255n
 */
export function bytesToBigInt(bytes: string): bigint {
    return BigInt(`0x${bytes}`)
}

/**
 * Converts a raw hex string to a number (not 0x prefixed)
 * e.g. bytesToNumber('ff') => 255
 */
export function bytesToNumber(bytes: string): number {
    return Number(`0x${bytes}`)
}
