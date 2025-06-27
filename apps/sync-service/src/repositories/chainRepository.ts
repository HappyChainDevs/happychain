import type { Hex } from "@happy.tech/common"
import type { Insertable, Selectable } from "kysely"
import { db } from "../db/driver"
import type { ChainRow } from "../db/types"
import type { Chain, ChainUpdate } from "../dtos"
import { nullToUndefined } from "../utils/nullToUndefined"

function fromDtoToDbUpdate(chain: ChainUpdate): Partial<Insertable<ChainRow>> {
    const { nativeCurrency, blockExplorerUrls, iconUrls, rpcUrls, type, ...rest } = chain
    return {
        ...rest,
        ...(nativeCurrency && { nativeCurrency: JSON.stringify(nativeCurrency) }),
        ...(blockExplorerUrls && { blockExplorerUrls: JSON.stringify(blockExplorerUrls) }),
        ...(iconUrls && { iconUrls: JSON.stringify(iconUrls) }),
        ...(rpcUrls && { rpcUrls: JSON.stringify(rpcUrls) }),
        updatedAt: Date.now(),
    }
}

function fromDbToDto(chain: Selectable<ChainRow>): Chain {
    return nullToUndefined({
        type: "Chain",
        ...chain,
        opStack: chain.opStack === 1,
        deleted: chain.deleted === 1,
    })
}

export function getChain(id: string) {
    return db.selectFrom("chains").where("id", "=", id).selectAll().executeTakeFirst()
}

export async function listChains(user: Hex, lastUpdated?: number): Promise<Chain[]> {
    const result = await db
        .selectFrom("chains")
        .where("user", "=", user)
        .$if(lastUpdated !== undefined, (qb) => qb.where("updatedAt", ">", lastUpdated as number))
        .selectAll()
        .execute()
    return result.map(fromDbToDto)
}

export async function saveChain(chain: ChainUpdate) {
    const existing = await getChain(chain.id)
    if (existing) {
        return await db
            .updateTable("chains")
            .set(fromDtoToDbUpdate(chain))
            .where("id", "=", chain.id)
            .execute()
    }

    return await db
        .insertInto("chains")
        .values(fromDtoToDbUpdate(chain) as Insertable<ChainRow>)
        .execute()
}

export async function deleteChain(id: string) {
    return await db
        .updateTable("chains")
        .set({ deleted: true, updatedAt: Date.now() })
        .where("id", "=", id)
        .execute()
}
