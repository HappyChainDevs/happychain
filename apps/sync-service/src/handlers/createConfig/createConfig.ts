import { type Result, ok } from "neverthrow"
import { createUUID } from "../../../../../support/common/dist/index.es"
import { savePermission } from "../../repositories/permissionsRepository"
import { notifyUpdates } from "../../services/notifyUpdates"
import type { CreateConfigInput } from "./types"
import { saveWatchedAsset } from "../../repositories/watchAssetsRepository"

export async function createConfig(input: CreateConfigInput): Promise<Result<undefined, Error>> {
    console.log(input)

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
            updatedAt: input.updatedAt,
        },
        id: createUUID(),
    })

    return ok(undefined)
}
