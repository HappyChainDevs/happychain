import { type Result, ok } from "neverthrow"
import { savePermission } from "../../repositories/permissionsRepository"
import type { CreateConfigInput } from "./types"
import { notifyUpdates } from "../../services/notifyUpdates"
import { createUUID } from "../../../../../support/common/dist/index.es"

export async function createConfig(input: CreateConfigInput): Promise<Result<undefined, Error>> {
    console.log(input)

    if (input.type === "WalletPermissions") {
        await savePermission(input)

        notifyUpdates({
            event: "WalletPermissions.created",
            data: {
                destination: input.user,
                resourceId: input.id,
                updatedAt: input.updatedAt,
            },
            id: createUUID(),
        })
    }

    return ok(undefined)
}
