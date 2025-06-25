import { type Address, createUUID } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import { deletePermission, getPermission } from "../../repositories/permissionsRepository"
import { deleteWatchedAsset, getWatchedAsset } from "../../repositories/watchAssetsRepository"
import { notifyUpdates } from "../../services/notifyUpdates"
import type { DeleteConfigInput } from "./types"

export async function deleteConfig(input: DeleteConfigInput): Promise<Result<void, Error>> {
    const permission = await getPermission(input.id)
    const watchedAsset = await getWatchedAsset(input.id)

    let user: Address
    if (permission) {
        await deletePermission(input.id)
        user = permission.user
    } else if (watchedAsset) {
        await deleteWatchedAsset(input.id)
        user = watchedAsset.user
    } else {
        return err(new Error("Config not found"))
    }

    notifyUpdates({
        event: "config.changed",
        data: {
            destination: user,
            resourceId: input.id,
            updatedAt: Date.now(),
        },
        id: createUUID(),
    })

    return ok(undefined)
}
