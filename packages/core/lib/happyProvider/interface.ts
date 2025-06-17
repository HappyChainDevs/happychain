import type { EventEmitter } from "node:events"
import type {
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    HappyUser,
    OverlayErrorCode,
} from "@happy.tech/wallet-common"
import type SafeEventEmitter from "@metamask/safe-event-emitter"
import type {
    AuthStateUpdateCallback,
    DisplayOverlayErrorCallback,
    ListenerUnsubscribeFn,
    UserUpdateCallback,
    WalletVisibilityCallback,
} from "./listeners"

/**
 * HappyProvider is an {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP1193 Ethereum Provider } and
 * an {@link https://nodejs.org/docs/latest/api/events.html | EventEmitter}.
 *
 * @example
 * ### Setting up viem client
 * ```ts twoslash
 * import { createPublicClient, custom } from "viem"
 * import { happyProvider } from "@happy.tech/core"
 *
 * const publicClient = createPublicClient({
 *   transport: custom(happyProvider)
 * })
 * ```
 */
export interface HappyProvider extends EventEmitter {
    /**
     * Makes an EIP-1193 request and returns the response.
     * @throws {@link HappyRpcError}
     */
    // biome-ignore lint/suspicious/noExplicitAny: let's not export all of Viem's types
    request: (args: any) => Promise<any>
}

export interface HappyProviderInternal extends HappyProvider {
    getCurrentUser(): HappyUser | undefined
    displayWallet(open: boolean): void
    showSendScreen(): void
    displayError(code: OverlayErrorCode): void
    onUserUpdate(callback: UserUpdateCallback): ListenerUnsubscribeFn
    onUserUpdate(callback: UserUpdateCallback): ListenerUnsubscribeFn
    onWalletVisibilityUpdate(callback: WalletVisibilityCallback): ListenerUnsubscribeFn
    onAuthStateUpdate(callback: AuthStateUpdateCallback): ListenerUnsubscribeFn
    onDisplayOverlayError(callback: DisplayOverlayErrorCallback): ListenerUnsubscribeFn
}

export interface EIP1193ConnectionHandler<TString extends EIP1193RequestMethods = EIP1193RequestMethods>
    extends SafeEventEmitter {
    request(args: EIP1193RequestParameters<TString>): Promise<EIP1193RequestResult<TString>>
}
