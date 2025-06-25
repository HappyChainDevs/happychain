import type { Hex } from "@happy.tech/common"
import type { Insertable, Selectable } from "kysely"
import { db } from "../db/driver"
import type { WatchAssetRow } from "../db/types"
import type { WatchAsset, WatchAssetUpdate } from "../dtos"

function fromDtoToDbUpdate(watchedAsset: WatchAssetUpdate): Partial<Insertable<WatchAssetRow>> {
    const { options, ...rest } = watchedAsset
    return {
        ...rest,
        ...(options ?? {}),
        updatedAt: Date.now(),
    }
}

function fromDbToDto(watchedAsset: Selectable<WatchAssetRow>): WatchAsset {
    return {
        type: "ERC20",
        options: {
            symbol: watchedAsset.symbol,
            address: watchedAsset.address,
            decimals: watchedAsset.decimals,
            image: watchedAsset.image ?? undefined,
        },
        user: watchedAsset.user,
        id: watchedAsset.id,
        updatedAt: watchedAsset.updatedAt,
        createdAt: watchedAsset.createdAt,
        deleted: watchedAsset.deleted === 1,
    }
}

export function getWatchedAsset(id: string) {
    return db.selectFrom("watchedAssets").where("id", "=", id).selectAll().executeTakeFirst()
}

export async function listWatchedAssets(user: Hex, lastUpdated?: number): Promise<WatchAsset[]> {
    const result = await db
        .selectFrom("watchedAssets")
        .where("user", "=", user)
        .$if(lastUpdated !== undefined, (qb) => qb.where("updatedAt", ">", lastUpdated as number))
        .selectAll()
        .execute()
    return result.map(fromDbToDto)
}

export async function saveWatchedAsset(watchedAsset: WatchAssetUpdate) {
    const existing = await getWatchedAsset(watchedAsset.id)
    if (existing) {
        return await db
            .updateTable("watchedAssets")
            .set(fromDtoToDbUpdate(watchedAsset))
            .where("id", "=", watchedAsset.id)
            .execute()
    }

    return await db
        .insertInto("watchedAssets")
        .values(fromDtoToDbUpdate(watchedAsset) as Insertable<WatchAssetRow>)
        .execute()
}

export async function deleteWatchedAsset(id: string) {
    return await db
        .updateTable("watchedAssets")
        .set({ deleted: true, updatedAt: Date.now() })
        .where("id", "=", id)
        .execute()
}
