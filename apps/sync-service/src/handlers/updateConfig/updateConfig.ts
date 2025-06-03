import { createUUID } from "@happy.tech/common"
import { type Result, ok } from "neverthrow"
import { savePermission } from "../../repositories/permissionsRepository"
import { notifyUpdates } from "../../services/notifyUpdates"
import type { UpdateConfigInput } from "./types"

export async function updateConfig(input: UpdateConfigInput): Promise<Result<void, Error>> {
    await savePermission(input)

    notifyUpdates({
        event: "WalletPermissions.updated",
        data: {
            destination: input.user,
            resourceId: createUUID(),
            updatedAt: input.updatedAt ?? Date.now(),
        },
        id: input.id,
    })

    return ok(undefined)
}
