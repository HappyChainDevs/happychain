import type { EIP1193EventName } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { happyProviderBus } from "../services/eventBus"
import { providerAtom } from "../state/provider"

/**
 * Subscribes to the current internal provider and
 * forwards all requested events to be
 * emitted by the happyProvider on the app-side
 */
export function useProviderEventsProxy(events: EIP1193EventName[]) {
    const provider = useAtomValue(providerAtom)

    useEffect(() => {
        const proxyEvent = (name: EIP1193EventName) => (event: unknown) => {
            happyProviderBus.emit("provider:event", {
                payload: { event: name, args: event },
            })
        }

        const callbacks = events.map((name) => [name, proxyEvent(name)] as const)

        for (const [name, callback] of callbacks) {
            provider?.on(name, callback)
        }

        return () => {
            for (const [name, callback] of callbacks) {
                provider?.removeListener(name, callback)
            }
        }
    }, [provider, events])
}
