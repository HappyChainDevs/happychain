import { createUUID } from "../utils/uuid"
import { icon64x64 } from "./icons"

export const injectedProviderInfo = {
    uuid: createUUID(),
    name: "Injected Browser",
    // phosphorus wallet icon
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><path d="M40,56V184a16,16,0,0,0,16,16H216a8,8,0,0,0,8-8V80a8,8,0,0,0-8-8H56A16,16,0,0,1,40,56h0A16,16,0,0,1,56,40H192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><circle cx="180" cy="132" r="12"/></svg>',
    rdns: "browser.injected",
}

export const happyProviderInfo = {
    icon: icon64x64,
    name: "HappyWallet",
    rdns: "tech.happy",
    uuid: createUUID(),
}
