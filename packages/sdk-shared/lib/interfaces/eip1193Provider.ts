import type { EIP1193Provider } from "viem"

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

export interface EIP6963AnnounceProviderEvent extends CustomEvent<EIP6963ProviderDetail> {
    type: "eip6963:announceProvider"
}

export interface ConnectionProvider {
    id: string
    name: string
    icon: string
    type: string
    enable: () => Promise<void>
    disable: () => Promise<void>
    getProvider: () => EIP1193Provider
}
