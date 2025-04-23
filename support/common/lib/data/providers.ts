import { createUUID } from "../utils/uuid"
import { happyLogo128x128, walletIcon } from "./icons"

/**
 * Stub EIP-6963 provider info for use with window.ethereum injected provider which
 * don't provide this information.
 */
export const injectedProviderInfo = {
    icon: walletIcon,
    name: "Injected Wallet",
    rdns: "wallet.injected",
    uuid: createUUID(),
}

/**
 * EIP-6963 provider for the happy wallet, injected into apps by the SDK.
 */
export const happyProviderInfo = {
    icon: happyLogo128x128,
    name: "HappyWallet",
    rdns: "tech.happy",
    uuid: createUUID(),
}
