import type { Address } from "@happy.tech/common"
import type { WatchAssetParameters } from "viem"

export type WatchedAsset = WatchAssetParameters & {
    user: Address
    id: string
    createdAt: number
    updatedAt: number
    deleted: boolean
}
