import type { Hex } from "@happy.tech/common"
import type { Insertable, Selectable } from "kysely"
import { db } from "../db/driver"
import type { WalletPermisisonRow } from "../db/types"
import type { WalletPermission, WalletPermissionUpdate } from "../dtos"

function fromDtoToDbUpdate(permission: WalletPermissionUpdate): Partial<Insertable<WalletPermisisonRow>> {
    const { type, caveats, ...rest } = permission
    return {
        ...rest,
        ...(caveats && { caveats: JSON.stringify(caveats) }),
        updatedAt: Date.now(),
    }
}

function fromDbToDto(permission: Selectable<WalletPermisisonRow>): WalletPermission {
    return {
        type: "WalletPermissions",
        ...permission,
        deleted: permission.deleted === 1,
    }
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

export async function savePermission(permission: WalletPermissionUpdate) {
    const existing = await getPermission(permission.id)
    if (existing) {
        return await db
            .updateTable("walletPermissions")
            .set(fromDtoToDbUpdate(permission))
            .where("id", "=", permission.id)
            .execute()
    }

    return await db
        .insertInto("walletPermissions")
        .values(fromDtoToDbUpdate(permission) as Insertable<WalletPermisisonRow>)
        .execute()
}

export async function deletePermission(id: string) {
    return await db
        .updateTable("walletPermissions")
        .set({ deleted: true, updatedAt: Date.now() })
        .where("id", "=", id)
        .execute()
}
