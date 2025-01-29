import type { WalletType } from "@happy.tech/core"

type HappyUser = {
    provider: string
    type: WalletType
    uid: string
    email: string
    name: string
    avatar: string
    address: `0x${string}`
    controllingAddress: `0x${string}`
    ens: string
}
