import { type Result, err, ok } from "neverthrow"
import { PermissionAlreadyExistsError } from "../../errors"
import { getPermission, savePermission } from "../../repositories/permissionsRepository"
import type { CreateConfigInput } from "./types"

export async function createConfig(input: CreateConfigInput): Promise<Result<undefined, Error>> {
    console.log(input)

    if (input.type === "WalletPermissions") {
        const permission = await getPermission(input.id)

        if (permission) {
            return err(new PermissionAlreadyExistsError())
        }

        await savePermission(input)
    }

    return ok(undefined)
}
