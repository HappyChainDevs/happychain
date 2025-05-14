import type { Address } from "@happy.tech/common"
import { useQuery } from "@tanstack/react-query"
import { getCurrentChain } from "#src/state/chains"
import { contractMetadataSchema } from "#src/utils/blockExplorerDataValidator"

/**
 * This module provides React Query hooks for fetching and caching data from the Blockscout API.
 * It offers a standardized way to access data including
 * smart contract information, transaction details, and address data.
 *
 * Key features:
 * - Query key management for React Query caching
 * - Dynamic Blockscout block explorer URL generation based on the current chain
 * - Type-safe data fetching with response validation
 * - Hooks for common blockchain data needs:
 *   - useSmartContract: Fetch and validate smart contract metadata
 *   - useTransaction: Retrieve transaction details
 *   - useAddressDetails: Get information about an address/wallet
 *
 * Usage:
 * ```
 * import { useSmartContract, useTransaction, useAddressDetails } from './path/to/this/file'
 *
 * // In a component:
 * const { data: contractData, isLoading } = useSmartContract('0x123...abc')
 * const { data: txData } = useTransaction('0xabc...123')
 * const { data: addressData } = useAddressDetails('0x456...def')
 * ```
 *
 * All hooks support standard React Query options for customization.
 */

/**
 * Query key factory for Blockscout block explorer data
 */
export const blockExplorerKeys = {
    /** Base key for all Blockscout explorer related queries */
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
        /** Base key for all Blockscout block explorer related queries */
        all: () => [...blockExplorerKeys.all, "addresses"] as const,

        /** Key for address details */
        detail: (address: Address) => [...blockExplorerKeys.addresses.all(), address] as const,
    },
}

/**
 * Creates a URL for the Blockscout API
 * @param path - API endpoint path (without leading slash)
 * @returns Full URL to the Blockscout block explorer API endpoint
 */
const blockExplorerUrl = (path: string): string => {
    const currentChain = getCurrentChain()
    const baseUrl = currentChain.blockExplorerUrls?.[0]

    if (!baseUrl) {
        throw new Error("No block explorer URL available for current chain.")
    }

    return `${baseUrl}/api/v2/${path}`
}

/**
 * Generic function to fetch data from Blockscout block explorer API
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
            const data = await fetchFromBlockExplorer(`smart-contracts/${address}`)
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
