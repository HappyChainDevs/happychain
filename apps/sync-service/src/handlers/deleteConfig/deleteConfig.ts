import { type Result, ok } from "neverthrow"
import { deletePermission, getPermission } from "../../repositories/permissionsRepository"
import type { DeleteConfigInput } from "./types"
import { createUUID } from "@happy.tech/common"
import { notifyUpdates } from "../../services/notifyUpdates"

export async function deleteConfig(input: DeleteConfigInput): Promise<Result<void, Error>> {
    const permission = await getPermission(input.id)

    if (!permission) {
        return ok(undefined)
    }

    await deletePermission(input.id)

    notifyUpdates({
        event: "WalletPermissions.deleted",
        data: {
            destination: permission.user,
            resourceId: input.id,
            updatedAt: permission.updatedAt,
        },
        id: createUUID(),
    })

    return ok(undefined)
}
