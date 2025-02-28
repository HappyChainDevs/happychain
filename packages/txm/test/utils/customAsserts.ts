import type { Address, TransactionReceipt } from "viem"
import { expect } from "vitest"

function assertReceipt(to: Address, from: Address, status: "success" | "reverted", receipt?: TransactionReceipt) {
    expect(receipt).toBeDefined()
    expect(receipt?.status).toBe(status)
    expect(receipt?.to?.toLocaleLowerCase()).toBe(to.toLowerCase())
    expect(receipt?.from.toLowerCase()).toBe(from.toLowerCase())
}

export function assertReceiptSuccess(to: Address, from: Address, receipt?: TransactionReceipt): void {
    assertReceipt(to, from, "success", receipt)
}

export function assertReceiptReverted(to: Address, from: Address, receipt?: TransactionReceipt): void {
    assertReceipt(to, from, "reverted", receipt)
}

export function assertIsDefined<T>(value: T): value is NonNullable<T> {
    const isDefined = value !== undefined && value !== null
    expect(isDefined).toBe(true)
    return isDefined
}
