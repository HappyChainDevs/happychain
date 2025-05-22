import type { Hex } from "@happy.tech/common"
import type { Insertable, Selectable } from "kysely"
import { db } from "../db/driver"
import type { WalletPermisisonRow } from "../db/types"
import type { WalletPermission } from "../dtos"

function fromDtoToDb(permission: WalletPermission): Insertable<WalletPermisisonRow> {
    return {
        ...permission,
        caveats: JSON.stringify(permission.caveats),
    }
}

function fromDbToDto(permission: Selectable<WalletPermisisonRow>): WalletPermission {
    return {
        type: "WalletPermissions",
        ...permission,
    }
}

export function savePermission(permission: WalletPermission) {
    return db.insertInto("walletPermissions").values(fromDtoToDb(permission)).execute()
}

export function getPermission(id: string) {
    return db.selectFrom("walletPermissions").where("id", "=", id).selectAll().executeTakeFirst()
}

export async function listPermissions(user: Hex, lastUpdated?: number): Promise<WalletPermission[]> {
    const result = await db
        .selectFrom("walletPermissions")
        .where("user", "=", user)
        .$if(lastUpdated !== undefined, (qb) => qb.where("updatedAt", ">", lastUpdated as number))
        .selectAll()
        .execute()

    return result.map(fromDbToDto)
}

export async function updatePermission(permission: WalletPermission) {
    return await db
        .updateTable("walletPermissions")
        .set(fromDtoToDb(permission))
        .where("id", "=", permission.id)
        .execute()
}

export async function deletePermission(id: string) {
    return await db.deleteFrom("walletPermissions").where("id", "=", id).execute()
}
