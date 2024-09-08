import type { EIP1193Provider } from "viem"

/**
 * Information exposed by all EIP-6963 providers.
 */
export interface EIP6963ProviderInfo {
    uuid: string
    name: string
    icon: string
    rdns: string
}

export interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo
    provider: EIP1193Provider
}

/**
 * Type of the event emitted when EIP-6963 providers announce themselves.
 */
export interface EIP6963AnnounceProviderEvent extends CustomEvent<EIP6963ProviderDetail> {
    type: "eip6963:announceProvider"
}
