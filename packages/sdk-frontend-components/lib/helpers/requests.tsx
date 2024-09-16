import { createStore } from "mipd"

const store = createStore()

export function createRequests(...args: Parameters<typeof store.findProvider>) {
    let provider = store.findProvider(...args)

    if (!provider) {
        console.warn("Failed to detect HappyChain provider. Retrying...")
        const retry = setInterval(() => {
            provider = store.findProvider(...args)
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
        requestPermissions: async () => {
            if (!provider?.provider) return
            await provider.provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
        },
        revokePermissions: async () => {
            if (!provider?.provider) return
            await provider.provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] })
        },

        onAccountsChanged: (setAccounts: (accounts: `0x${string}`[]) => void) => {
            if (!provider?.provider) return
            const { provider: _provider } = provider
            _provider.on("accountsChanged", setAccounts)
            return () => _provider.removeListener("accountsChanged", setAccounts)
        },
    }
}
