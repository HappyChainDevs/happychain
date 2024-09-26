import type { HappyUser, RPCMethods } from "@happychain/sdk-shared"
import type { EIP6963ProviderDetail } from "mipd"
import { createStore } from "mipd"
import type { EIP1193Events, EIP1193RequestFn, Prettify } from "viem"

const store = createStore()

type ViemHappyProvider = Prettify<EIP1193Events & { request: EIP1193RequestFn<RPCMethods> }>

type ProviderDetail = EIP6963ProviderDetail<ViemHappyProvider, "tech.happy">
declare module "mipd" {
    export interface Register {
        provider: ProviderDetail["provider"]
        rdns: ProviderDetail["info"]["rdns"]
    }
}

export function createRequests(...args: Parameters<typeof store.findProvider>) {
    let provider = store.findProvider(...args) as ProviderDetail

    if (!provider) {
        console.warn("Failed to detect HappyChain provider. Retrying...")
        const retry = setInterval(() => {
            provider = store.findProvider(...args) as ProviderDetail
            if (provider) {
                clearInterval(retry)
            }
        }, 250)

        setTimeout(() => {
            if (!provider) {
                console.error(
                    "Failed to detect HappyChain provider. Please refer to the docs for more information on how to initialize with HappyChain",
                )
                clearInterval(retry)
            }
        }, 30_000)
    }

    return {
        providerInfo: () => provider?.info,

        fetchAccounts: async () => {
            if (!provider?.provider) return []
            return (await provider.provider.request({ method: "eth_accounts" })) ?? []
        },

        fetchUser: async (): Promise<HappyUser | undefined> => {
            if (!provider?.provider) return
            return await provider.provider.request({ method: "happy_user" })
        },

        requestPermissions: async () => {
            if (!provider?.provider) return
            await provider.provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        },
        revokePermissions: async () => {
            if (!provider?.provider) return
            await provider.provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] })
        },

        onAccountsChanged: (setUser: (_user?: HappyUser | undefined) => void) => {
            if (!provider?.provider) return
            const { provider: _provider } = provider

            async function updateUser(accounts: `0x${string}`[]) {
                if (accounts.length) {
                    const user = await _provider.request({ method: "happy_user" })
                    setUser(user)
                } else {
                    setUser(undefined)
                }
            }

            _provider.on("accountsChanged", updateUser)
            return () => _provider.removeListener("accountsChanged", updateUser)
        },
    }
}
