import { createUUID } from "@happy.tech/common"
import { type Result, ok } from "neverthrow"
import { savePermission } from "../../repositories/permissionsRepository"
import { notifyUpdates } from "../../services/notifyUpdates"
import type { UpdateConfigInput } from "./types"
import { saveWatchedAsset } from "../../repositories/watchAssetsRepository"

export async function updateConfig(input: UpdateConfigInput): Promise<Result<void, Error>> {
    if (input.type === "WalletPermissions") {
        await savePermission(input)
    } else if (input.type === "ERC20") {
        await saveWatchedAsset(input)
    }

    notifyUpdates({
        event: "config.changed",
        data: {
            destination: input.user,
            resourceId: input.id,
            updatedAt: Date.now(),
        },
        id: input.id,
    })

    return ok(undefined)
}
