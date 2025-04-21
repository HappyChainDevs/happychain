import { type HappyUser, type OverlayErrorCode, SafeEventEmitter } from "@happy.tech/wallet-common"
import type { HappyProviderInternal } from "./interface"
import type {
    AuthStateUpdateCallback,
    DisplayOverlayErrorCallback,
    ListenerUnsubscribeFn,
    UserUpdateCallback,
    WalletVisibilityCallback,
} from "./listeners"

/**
 * Mock implementation that ensures the SDK can be imported in SSR-first frameworks without errors
 */
export class HappyProviderSSRSafe extends SafeEventEmitter implements HappyProviderInternal {
    async request(): Promise<never> {
        throw new Error("Provider not available in server environment")
    }

    getCurrentUser(): HappyUser | undefined {
        return undefined
    }

    displayWallet(_open: boolean): void {}

    showSendScreen(): void {}

    displayError(_code: OverlayErrorCode): void {}

    onUserUpdate(_callback: UserUpdateCallback): ListenerUnsubscribeFn {
        return () => {}
    }

    onWalletVisibilityUpdate(_callback: WalletVisibilityCallback): ListenerUnsubscribeFn {
        return () => {}
    }

    onAuthStateUpdate(_callback: AuthStateUpdateCallback): ListenerUnsubscribeFn {
        return () => {}
    }

    onDisplayOverlayError(_callback: DisplayOverlayErrorCallback): ListenerUnsubscribeFn {
        return () => {}
    }
}
