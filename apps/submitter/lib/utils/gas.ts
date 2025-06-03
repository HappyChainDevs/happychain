import type { Transaction } from "viem"
import type { SimulateSuccess } from "#lib/client"

// Needs to be >= 10 to be considered for replacement EVM tx to be considered.
const feeBumpPercent = 15n
const defaultPriorityFee = 1n

export function getMaxPriorityFeePerGas(replacedTx?: Transaction): bigint {
    const tip = replacedTx?.maxPriorityFeePerGas
    if (!tip) return defaultPriorityFee
    const repriced = (tip * (100n + feeBumpPercent)) / 100n
    return repriced > tip ? repriced : tip + 1n // 115% of 1 is still 1, so bump by at least 1
}

export function getMaxFeePerGas(simulation: SimulateSuccess, replacedTx?: Transaction): bigint {
    if (!replacedTx) return simulation.maxFeePerGas
    const repriced = (replacedTx.maxFeePerGas! * (100n + feeBumpPercent)) / 100n
    // If the gas price has increased more than what our bump would achieve, use the current price instead.
    return simulation.maxFeePerGas > repriced ? simulation.maxFeePerGas : repriced
}
