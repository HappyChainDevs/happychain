import type { Address } from "@happy.tech/common"
import type { FaucetUsageRow } from "./db/types"

export class FaucetUsage {
    public readonly address: Address
    public readonly occurredAt: Date

    constructor(address: Address, occurredAt: Date) {
        this.address = address
        this.occurredAt = occurredAt
    }

    static create(address: Address): FaucetUsage {
        return new FaucetUsage(address, new Date())
    }

    static fromRow(row: FaucetUsageRow): FaucetUsage {
        return new FaucetUsage(row.address, new Date(Number(row.occurredAt)))
    }

    toRow(): FaucetUsageRow {
        return {
            address: this.address,
            occurredAt: BigInt(this.occurredAt.getTime()),
        }
    }
}
