import { HappyMethodNames, type UUID, createUUID, happyProviderInfo, injectedProviderInfo } from "@happy.tech/common"
import type {
    HappyUser,
    MsgsFromApp,
    MsgsFromIframe,
    OverlayErrorCode,
    ProviderMsgsFromApp,
    ProviderMsgsFromIframe,
} from "@happy.tech/wallet-common"
import { EventBus, EventBusMode, Msgs, WalletDisplayAction } from "@happy.tech/wallet-common"
import { announceProvider, createStore } from "mipd"
import type { Abi, Address, EIP1193Provider } from "viem"
import { config } from "../config"
import { HappyProvider, HappyProviderSSRSafe } from "./happyProvider"
import type { HappyProviderPublic } from "./interface"
import { registerListeners } from "./listeners"

const mipdStore = createStore()

/**
 * Unique Window UUID.
 * Falls back to "server" in SSR environments.
 * @internal
 */
export const windowId = typeof window === "undefined" ? "server" : createUUID()

let iframeMessageBus: EventBus<MsgsFromIframe, MsgsFromApp> | null = null
let provider: (HappyProvider & EIP1193Provider) | null = null
let iframeReady = false
let user: HappyUser | undefined

/**
 * Initializes the Happy Account wallet state and communication with the iframe.
 * Handles authentication, connection, and messaging between app and iframe contexts.
 */
function initializeProvider() {
    if (typeof window === "undefined") return null
    if (provider) return provider

    iframeMessageBus = new EventBus<MsgsFromIframe, MsgsFromApp>({
        mode: EventBusMode.AppPort,
        scope: "happy-chain-dapp-bus",
    })

    const { onUserUpdate: _onUserUpdate, onIframeInit: _onIframeInit } = registerListeners(iframeMessageBus)

    _onIframeInit((ready: boolean) => {
        iframeReady = ready

        if ("ethereum" in window) {
            // listen to message bus instead of window here because when embedded, in many situations, the
            // providers will not be detected. Duplicates are fine as we use the provider.id as the unique key
            iframeMessageBus?.emit(Msgs.AnnounceInjectedProvider, {
                info: injectedProviderInfo,
            })
        }

        mipdStore.getProviders().forEach((detail) => {
            // don't forward ourselves to the iframe
            if (detail.info.rdns === "tech.happy") return

            iframeMessageBus?.emit(Msgs.AnnounceInjectedProvider, { info: detail.info })
        })
    })

    _onUserUpdate((_user?: HappyUser) => {
        user = _user
    })

    provider = new HappyProvider({
        iframePath: config.iframePath,
        windowId: windowId as UUID,
        providerBus: new EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>({
            mode: EventBusMode.AppPort,
            scope: "happy-chain-eip1193-provider",
        }),
        msgBus: iframeMessageBus,
    }) as HappyProvider & EIP1193Provider

    announceProvider({
        info: happyProviderInfo,
        provider: provider,
    })

    return provider
}

function getInitializedProvider() {
    return provider ?? initializeProvider()
}

/**
 * @returns The user currently connected to the app, if any.
 */
export const getCurrentUser = (): HappyUser | undefined => {
    if (!iframeReady) {
        console.warn("getCurrentUser was called before happychain-sdk was ready. result will be empty")
    }
    return user
}

/**
 * Connect the app to the Happy Account (will prompt user for permission).
 */
export const connect = async (): Promise<void> => {
    const _provider = getInitializedProvider()
    if (!_provider) return

    await _provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    })
}

/**
 * Disconnect the app from the Happy Account.
 */
export const disconnect = async (): Promise<void> => {
    const _provider = getInitializedProvider()
    if (!_provider) return

    await _provider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
    })
}

/**
 * Add a contract address and its corresponding ABI to be tracked (in browser)
 * to translate tx calldata using existing recorded ABI info.
 */
export const loadAbi = async (contractAddress: Address, abi: Abi): Promise<void> => {
    const _provider = getInitializedProvider()
    if (!_provider) return undefined

    await _provider.request({
        method: HappyMethodNames.USE_ABI,
        params: {
            address: contractAddress,
            abi: abi,
        },
    })
}

export const requestSessionKey = async (contractAddress: Address): Promise<void> => {
    const _provider = getInitializedProvider()
    if (!_provider) return

    await _provider.request({
        method: HappyMethodNames.REQUEST_SESSION_KEY,
        params: [contractAddress],
    })
}

/**
 * Display the send screen in the iframe
 */
export const showSendScreen = (): void => {
    void iframeMessageBus?.emit(Msgs.RequestWalletDisplay, WalletDisplayAction.Send)
}
export function emitWalletDisplayAction(open: boolean) {
    void iframeMessageBus?.emit(Msgs.RequestWalletDisplay, open ? WalletDisplayAction.Open : WalletDisplayAction.Closed)
}
export function emitSetDisplayError(errorCode: OverlayErrorCode) {
    void iframeMessageBus?.emit(Msgs.SetOverlayError, errorCode)
}

export function openWallet() {
    return emitWalletDisplayAction(true)
}

/**
 * This is an {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP1193 Ethereum Provider}
 */
export const happyProvider = (
    typeof window === "undefined"
        ? new HappyProviderSSRSafe()
        : (provider ?? initializeProvider() ?? new HappyProviderSSRSafe())
) as HappyProvider & EIP1193Provider

/**
 * HappyProvider is an [EIP1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider.
 *
 * @example
 * ### Setting up viem client
 * ```ts twoslash
 * import { createPublicClient, custom } from 'viem'
 * import { happyProvider } from '@happy.tech/core'
 * // ---cut---
 * const publicClient = createPublicClient({
 *   transport: custom(happyProvider)
 * })
 * ```
 */
export const happyProviderPublic: HappyProviderPublic = happyProvider

const getListeners = () => {
    return iframeMessageBus
        ? registerListeners(iframeMessageBus)
        : {
              onUserUpdate: () => () => {},
              onWalletVisibilityUpdate: () => () => {},
              onAuthStateUpdate: () => () => {},
              onIframeInit: () => () => {},
              onDisplayOverlayError: () => () => {},
          }
}

export const { onUserUpdate, onWalletVisibilityUpdate, onAuthStateUpdate, onIframeInit, onDisplayOverlayError } =
    getListeners()
