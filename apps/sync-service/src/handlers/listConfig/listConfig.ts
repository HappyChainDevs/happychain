import { type Result, ok } from "neverthrow"
import type { WalletPermission, WatchAsset } from "../../dtos"
import { listPermissions } from "../../repositories/permissionsRepository"
import { listWatchedAssets } from "../../repositories/watchAssetsRepository"
import type { ListConfigInput } from "./types"

export async function listConfig(input: ListConfigInput): Promise<Result<(WalletPermission | WatchAsset)[], Error>> {
    const config: (WalletPermission | WatchAsset)[] = []
    if (input.type === "WalletPermissions" || input.type === undefined) {
        const permissions = await listPermissions(input.user, input.lastUpdated)
        config.push(...permissions)
    }
    if (input.type === "ERC20" || input.type === undefined) {
        const watchedAssets = await listWatchedAssets(input.user, input.lastUpdated)
        config.push(...watchedAssets)
    }

    return ok(config)
}
