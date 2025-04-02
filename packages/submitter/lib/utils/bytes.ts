import type { Address } from "viem/accounts"
import { getAddress } from "viem/utils"

export function toBytes(data: bigint | number | undefined, bytes: number): string {
    if (!data) return "0".padStart(bytes * 2, "0")
    return data.toString(16).padStart(bytes * 2, "0")
}

export function toDynamicLengthBytes(data: string): string {
    return `${toBytes(data.length / 2, 4)}${data}`
}

export function getBytes(raw: string, offset: number, length: number): string {
    const offset_ = offset * 2
    return raw.slice(offset_, offset_ + length * 2)
}

export function getDynamicLengthBytes(raw: string, startOffset: number): [string, number] {
    const callDataLen = bytesToNumber(getBytes(raw, startOffset, 4))
    const data = getBytes(raw, startOffset + 4, callDataLen)
    const endOffset = startOffset + callDataLen + 4
    return [data, endOffset]
}

export function bytesToAddress(bytes: string): Address {
    return getAddress(`0x${bytes}`)
}

export function bytesToBigInt(bytes: string): bigint {
    return BigInt(`0x${bytes}`)
}
export function bytesToNumber(bytes: string): number {
    return Number(`0x${bytes}`)
}
