import type { RPCMethods } from "@happychain/sdk-shared"
import type { EIP6963ProviderDetail } from "mipd"
import { createStore } from "mipd"
import type { EIP1193Events, EIP1193RequestFn, Prettify } from "viem"

const store = createStore()

type ViemHappyProvider = Prettify<EIP1193Events & { request: EIP1193RequestFn<RPCMethods> }>

type ProviderDetail = EIP6963ProviderDetail<ViemHappyProvider, string>
declare module "mipd" {
    export interface Register {
        provider: ProviderDetail["provider"]
        rdns: ProviderDetail["info"]["rdns"]
    }
}

export function getProvider(...args: Parameters<typeof store.findProvider>) {
    return store.findProvider(...args)
}
