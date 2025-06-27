import { createUUID } from "@happy.tech/common"
import { type Result, ok } from "neverthrow"
import { savePermission } from "../../repositories/permissionsRepository"
import { saveWatchedAsset } from "../../repositories/watchAssetsRepository"
import { notifyUpdates } from "../../services/notifyUpdates"
import type { CreateConfigInput } from "./types"
import { saveChain } from "../../repositories/chainRepository"

export async function createConfig(input: CreateConfigInput): Promise<Result<undefined, Error>> {
    if (input.type === "WalletPermissions") {
        await savePermission(input)
    } else if (input.type === "ERC20") {
        await saveWatchedAsset(input)
    } else if (input.type === "Chain") {
        await saveChain(input)
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
