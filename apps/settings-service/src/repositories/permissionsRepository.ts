import type { Hex } from "@happy.tech/common"
import { db } from "../db/driver"
import type { WalletPermission } from "../db/types"

export function savePermission(permission: WalletPermission) {
    return db
        .insertInto("walletPermissions")
        .values({
            user: permission.user,
            invoker: permission.invoker,
            parentCapability: permission.parentCapability,
            caveats: JSON.stringify(permission.caveats),
            date: permission.date,
            id: permission.id,
            updatedAt: Date.now(),
            deleted: permission.deleted,
        })
        .execute()
}

export async function listPermissions(user: Hex, lastUpdated?: number): Promise<WalletPermission[]> {
    return await db
        .selectFrom("walletPermissions")
        .where("user", "=", user)
        .$if(lastUpdated !== undefined, (qb) => qb.where("updatedAt", ">", lastUpdated as number))
        .selectAll()
        .execute()
}
