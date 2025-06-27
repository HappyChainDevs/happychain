import { type Result, ok } from "neverthrow"
import type { WalletPermission, WatchAsset, Chain } from "../../dtos"
import { listPermissions } from "../../repositories/permissionsRepository"
import { listWatchedAssets } from "../../repositories/watchAssetsRepository"
import type { ListConfigInput } from "./types"
import { listChains } from "../../repositories/chainRepository"

export async function listConfig(input: ListConfigInput): Promise<Result<(WalletPermission | WatchAsset | Chain)[], Error>> {
    const config: (WalletPermission | WatchAsset | Chain)[] = []
    if (input.type === "WalletPermissions" || input.type === undefined) {
        const permissions = await listPermissions(input.user, input.lastUpdated)
        config.push(...permissions)
    }
    if (input.type === "ERC20" || input.type === undefined) {
        const watchedAssets = await listWatchedAssets(input.user, input.lastUpdated)
        config.push(...watchedAssets)
    }
    if (input.type === "Chain" || input.type === undefined) {
        const chains = await listChains(input.user, input.lastUpdated)
        config.push(...chains)
    }

    return ok(config)
}
