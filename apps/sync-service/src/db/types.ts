import type { Hex } from "@happy.tech/common"
import type { HTTPString } from "@happy.tech/common"
import type { ColumnType } from "kysely"

export type AppURL = HTTPString & { _brand: "AppHTTPString" }

/**
 * A caveat is a specific specific restrictions applied to the permitted request.
 */
type WalletPermissionCaveat = {
    type: string
    value: string
}

/**
 * Permission object for a specific permission.
 *
 * This type is copied from Viem (eip1193.ts)  but we add a user field.
 */
export type WalletPermisisonRow = {
    // The user to which the permission is granted.
    user: Hex
    // The app to which the permission is granted.
    invoker: AppURL
    // This is the EIP-1193 request that this permission is mapped to.
    parentCapability: string
    caveats: ColumnType<WalletPermissionCaveat[], string, string>
    date: number
    // Not in the EIP, but Viem wants this.
    id: string
    updatedAt: number
    createdAt: number
}

export interface Database {
    walletPermissions: WalletPermisisonRow
}
