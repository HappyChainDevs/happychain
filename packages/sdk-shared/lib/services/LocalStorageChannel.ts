import type { SafePort } from "../interfaces/safeport"

/**
 * LocalStorageChannel acts as a roughly compatible drop-in replacement for
 * BroadcastChannel. It takes advantage of the localStorage same-origin access, whereas
 * BroadcastChannel only allows for communication on the same browsing context group,
 * specifically as defined by the storage/state partition, and therefor (depending
 * on browser implementations) restricts communication between the request popup &
 * embedded iframe which can be on separate state partitions.
 *
 * c.f.
 * - https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context
 * - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 * - https://developer.mozilla.org/en-US/docs/Web/Privacy/State_Partitioning
 */
export class LocalStorageChannel implements SafePort {
    private readonly key

    constructor(scope: string) {
        this.key = `local-storage-broadcast-channel:${scope}`

        globalThis.addEventListener("storage", (ev) => {
            if (!this.isStorageEvent(ev)) return
            if (ev.key !== this.key) return

            try {
                const val = ev.newValue ? JSON.parse(ev.newValue) : null
                this.onmessage(new MessageEvent(`${this.key}-message`, { data: val }))
            } catch (_e) {
                this.onmessageerror(new MessageEvent(`${this.key}-message`, { data: _e }))
            }
        })
    }

    // overwrite this
    onmessage = (_a: MessageEvent) => {}
    onmessageerror = (_e: MessageEvent) => {}

    postMessage(msg: unknown) {
        localStorage.setItem(this.key, JSON.stringify(msg))
    }

    private isStorageEvent(ev: Event): ev is StorageEvent {
        return "key" in ev && "newValue" in ev && (ev.newValue === null || typeof ev.newValue === "string")
    }
}
