import type { EIP6963AnnounceProviderEvent } from "@happy.tech/wallet-common"

export function isEip6963Event(evt: Event): evt is EIP6963AnnounceProviderEvent {
    return Boolean(
        typeof evt === "object" &&
            "detail" in evt &&
            typeof evt.detail === "object" &&
            evt.detail &&
            "info" in evt.detail &&
            "provider" in evt.detail,
    )
}
