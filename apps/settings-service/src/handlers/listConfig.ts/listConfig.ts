import { type Result, ok } from "neverthrow"
import type { WalletPermission } from "../../db/types"
import { listPermissions } from "../../repositories/permissionsRepository"
import type { ListConfigInput } from "./types"

export async function listConfig(input: ListConfigInput): Promise<Result<WalletPermission[], Error>> {
    const permissions = await listPermissions(input.user, input.lastUpdated)

    console.log(permissions.map((p) => p.caveats))

    return ok(
        permissions.map((p) => ({
            type: "WalletPermissions",
            ...p,
        })),
    )
}
