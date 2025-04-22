import type { Address } from "viem"

export interface FaucetUsageRow {
    address: Address
    occurredAt: bigint
}

export interface Database {
    faucetUsage: FaucetUsageRow
}
