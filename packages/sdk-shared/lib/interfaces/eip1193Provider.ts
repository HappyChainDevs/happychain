import type {
    EIP1193EventMap,
    EIP1193Parameters,
    EIP1193Provider,
    EIP1474Methods,
    PublicRpcSchema,
    WalletRpcSchema,
} from "viem"
import type { MessageChannelEventPayload } from "./events"
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
}

export type EIP1193RequestMethods = EIP1474Methods[number]["Method"]
export type EIP1193RequestPublicClientMethods = PublicRpcSchema[number]["Method"]
export type EIP1193RequestWalletClientMethods = WalletRpcSchema[number]["Method"]

export type EIP1193RequestParameters<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    EIP1193Parameters<EIP1474Methods>,
    { method: TString }
>

export type EIP1193RequestResult<TString extends EIP1193RequestMethods = EIP1193RequestMethods> = Extract<
    EIP1474Methods[number],
    { Method: TString }
>["ReturnType"]

export type EIP1193EventName<T extends string = keyof EIP1193EventMap> = T

export type ProviderEventPayload<T = unknown> = MessageChannelEventPayload<T> & {
    error: null
}

export type ProviderEventError<T = unknown> = MessageChannelEventPayload<null> & {
    error: T
}
