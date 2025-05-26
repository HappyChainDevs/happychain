import type { Transaction } from "viem"
import type { SimulateSuccess } from "#lib/client"

const defaultPriorityFee = 1n

export function getMaxPriorityFeePerGas(replacedTx?: Transaction): bigint {
    const tip = replacedTx?.maxPriorityFeePerGas
    if (!tip) return defaultPriorityFee
    const repriced = (tip * 115n) / 100n
    return repriced > tip ? repriced : tip + 1n
}

export function getMaxFeePerGas(simulation: SimulateSuccess, replacedTx?: Transaction): bigint {
    if (!replacedTx) return simulation.maxFeePerGas
    const repriced = (replacedTx.maxFeePerGas! * 115n) / 100n
    return simulation.maxFeePerGas > repriced ? simulation.maxFeePerGas : repriced
}
