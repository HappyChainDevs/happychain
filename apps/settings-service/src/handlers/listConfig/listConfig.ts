import { type Result, ok } from "neverthrow"
import type { WalletPermission } from "../../dtos"
import { listPermissions } from "../../repositories/permissionsRepository"
import type { ListConfigInput } from "./types"

export async function listConfig(input: ListConfigInput): Promise<Result<WalletPermission[], Error>> {
    const permissions = await listPermissions(input.user, input.lastUpdated)

    return ok(permissions)
}
