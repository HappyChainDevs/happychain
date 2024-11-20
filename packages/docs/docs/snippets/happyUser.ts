import type { WalletType } from "@happychain/js"

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