import { useQuery } from "@tanstack/react-query"
import type { Address } from "viem"
import { getCurrentChain } from "#src/state/chains"
import { contractMetadataSchema } from "#src/utils/blockExplorerDataValidator"

/**
 * Query key factory for block explorer data
 */
export const blockExplorerKeys = {
    /** Base key for all block explorer related queries */
    all: [Symbol("blockExplorer")] as const,

    /** Smart contract related query keys */
    contracts: {
        /** Base key for all contract related queries */
        all: () => [...blockExplorerKeys.all, "contracts"] as const,

        /** Key for single contract data */
        detail: (address: Address) => [...blockExplorerKeys.contracts.all(), address] as const,
    },

    /** Transaction related query keys */
    transactions: {
        /** Base key for all transaction related queries */
        all: () => [...blockExplorerKeys.all, "transactions"] as const,

        /** Key for single transaction data */
        detail: (hash: string) => [...blockExplorerKeys.transactions.all(), hash] as const,
    },

    /** Address related query keys */
    addresses: {
        /** Base key for all block explorer related queries */
        all: () => [...blockExplorerKeys.all, "addresses"] as const,

        /** Key for address details */
        detail: (address: Address) => [...blockExplorerKeys.addresses.all(), address] as const,
    },
}

/**
 * Creates a URL for the block explorer API
 * @param path - API endpoint path (without leading slash)
 * @returns Full URL to the block explorer API endpoint
 */
export const blockExplorerUrl = (path: string): string => {
    const currentChain = getCurrentChain()
    const baseUrl = currentChain.blockExplorerUrls?.[0]

    if (!baseUrl) {
        throw new Error("No block explorer URL available for current chain.")
    }

    return `${baseUrl}/api/v2/${path}`
}

/**
 * Generic function to fetch data from block explorer API
 * @param path - API endpoint path (without leading slash)
 * @returns Promise resolving to the parsed JSON response
 * @throws Error with descriptive message on failure
 */
const fetchFromBlockExplorer = async <T>(path: string): Promise<T> => {
    const url = blockExplorerUrl(path)
    const response = await fetch(url, {
        headers: { accept: "application/json" },
    })

    // API spec defines 200 for success, 400 for errors
    if (response.status === 400) {
        // Handle specific bad request errors
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Invalid request: ${errorData.message || response.statusText}`)
    }

    if (response.status !== 200) {
        // Handle any other non-200 responses
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

export function useSmartContract(address: Address, options = {}) {
    return useQuery({
        queryKey: blockExplorerKeys.contracts.detail(address),
        queryFn: async () => {
            const data = await fetchFromBlockExplorer<unknown>(`smart-contracts/${address}`)
            return contractMetadataSchema.parse(data)
        },
        enabled: Boolean(address),
        ...options,
    })
}

export function useTransaction(hash: string, options = {}) {
    return useQuery({
        queryKey: blockExplorerKeys.transactions.detail(hash),
        queryFn: () => fetchFromBlockExplorer(`transactions/${hash}`),
        enabled: Boolean(hash),
        ...options,
    })
}

export function useAddressDetails(address: Address, options = {}) {
    return useQuery({
        queryKey: blockExplorerKeys.addresses.detail(address),
        queryFn: () => fetchFromBlockExplorer(`addresses/${address}`),
        enabled: Boolean(address),
        ...options,
    })
}
