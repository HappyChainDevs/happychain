import { type Result, err, ok } from "neverthrow"
import { PermissionNotFoundError } from "../../errors"
import { getPermission, updatePermission } from "../../repositories/permissionsRepository"
import type { UpdateConfigInput } from "./types"

export async function updateConfig(input: UpdateConfigInput): Promise<Result<void, PermissionNotFoundError>> {
    const permission = await getPermission(input.id)

    if (!permission) {
        return err(new PermissionNotFoundError())
    }

    await updatePermission(input)

    return ok(undefined)
}
