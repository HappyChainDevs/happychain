import type { Address } from "@happy.tech/common"

export interface FaucetUsageRow {
    address: Address
    occurredAt: bigint
}

export interface Database {
    faucetUsage: FaucetUsageRow
}
