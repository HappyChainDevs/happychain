import { type Result, ok } from "neverthrow"
import { deletePermission } from "../../repositories/permissionsRepository"
import type { DeleteConfigInput } from "./types"

export async function deleteConfig(input: DeleteConfigInput): Promise<Result<void, Error>> {
    await deletePermission(input.id)

    return ok(undefined)
}
