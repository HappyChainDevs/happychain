import { type Result, ok } from "neverthrow"
import { savePermission } from "../../repositories/permissionsRepository"
import type { CreateConfigInput } from "./types"

export async function createConfig(input: CreateConfigInput): Promise<Result<undefined, Error>> {
    console.log(input)

    if (input.type === "WalletPermissions") {
        await savePermission(input)
    }

    return ok(undefined)
}
