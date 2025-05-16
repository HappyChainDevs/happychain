import type { Hex } from "@happy.tech/common"
import type { UUID } from "@happy.tech/common"
import type { Insertable, Selectable } from "kysely"
import { db } from "../db/driver"
import type { WalletPermissionTable } from "../db/types"
import type { WalletPermission } from "../dtos"

function fromDtoToDb(permission: WalletPermission): Insertable<WalletPermissionTable> {
    return {
        user: permission.user,
        invoker: permission.invoker,
        parentCapability: permission.parentCapability,
        caveats: JSON.stringify(permission.caveats),
        date: permission.date,
        id: permission.id,
        updatedAt: permission.updatedAt,
        deleted: permission.deleted,
    }
}

function fromDbToDto(permission: Selectable<WalletPermissionTable>): WalletPermission {
    return {
        type: "WalletPermissions",
        user: permission.user,
        invoker: permission.invoker,
        parentCapability: permission.parentCapability,
        caveats: permission.caveats,
        date: permission.date,
        id: permission.id,
        updatedAt: permission.updatedAt,
        deleted: permission.deleted === 1,
    }
}

export function savePermission(permission: WalletPermission) {
    return db.insertInto("walletPermissions").values(fromDtoToDb(permission)).execute()
}

export function getPermission(id: UUID) {
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

export async function deletePermission(id: UUID) {
    return await db.updateTable("walletPermissions").set({ deleted: true }).where("id", "=", id).execute()
}
