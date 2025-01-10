import { createUUID } from "../utils/uuid"
import { icon64x64, walletIcon } from "./icons"

export const injectedProviderInfo = {
    icon: walletIcon,
    name: "Injected Browser",
    rdns: "browser.injected",
    uuid: createUUID(),
}

export const happyProviderInfo = {
    icon: icon64x64,
    name: "HappyWallet",
    rdns: "tech.happy",
    uuid: createUUID(),
}
